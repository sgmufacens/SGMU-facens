'use client'

import { useEffect, useState } from 'react'
import {
  Clock, CheckCircle, MapPin, Gauge, Camera,
  ChevronDown, ChevronUp, Download, Filter, X, Route,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type StatusFilter = 'all' | 'open' | 'closed'

interface Filters {
  status: StatusFilter
  dateFrom: string
  dateTo: string
  vehicleId: string
  collaboratorId: string
}

const EMPTY_FILTERS: Filters = {
  status: 'all',
  dateFrom: '',
  dateTo: '',
  vehicleId: '',
  collaboratorId: '',
}

export default function HistoryPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [vehicles, setVehicles] = useState<{ id: string; plate: string; brand: string; model: string }[]>([])
  const [collaborators, setCollaborators] = useState<{ id: string; name: string; badge_number: string }[]>([])

  // Carrega selects de filtro uma única vez
  useEffect(() => {
    Promise.all([
      supabase.from('vehicles').select('id, plate, brand, model').order('plate'),
      supabase.from('collaborators').select('id, name, badge_number').order('name'),
    ]).then(([{ data: v }, { data: c }]) => {
      setVehicles(v ?? [])
      setCollaborators(c ?? [])
    })
  }, [])

  // Recarrega viagens quando filtros mudam
  useEffect(() => {
    async function load() {
      setLoading(true)

      let query = supabase
        .from('trips')
        .select(`*, vehicle:vehicles(plate,model,brand,branch:branches(name,city)), collaborator:collaborators(name,badge_number), origin_branch:branches!trips_origin_branch_id_fkey(name,city), destination_branch:branches!trips_destination_branch_id_fkey(name,city)`)
        .order('departed_at', { ascending: false })
        .limit(500)

      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId)
      if (filters.collaboratorId) query = query.eq('collaborator_id', filters.collaboratorId)
      if (filters.dateFrom) query = query.gte('departed_at', new Date(filters.dateFrom).toISOString())
      if (filters.dateTo) {
        const end = new Date(filters.dateTo)
        end.setHours(23, 59, 59, 999)
        query = query.lte('departed_at', end.toISOString())
      }

      const { data } = await query
      setTrips(data ?? [])
      setLoading(false)
    }
    load()
  }, [filters])

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  const hasActiveFilters =
    filters.status !== 'all' ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.vehicleId ||
    !!filters.collaboratorId

  // Métricas calculadas do resultado atual
  const totalKm = trips.reduce((s, t) => s + (t.km_driven ?? 0), 0)
  const closedCount = trips.filter(t => t.status === 'closed').length
  const openCount = trips.filter(t => t.status === 'open').length

  function exportCSV() {
    const header = [
      'Data Saída', 'Data Chegada', 'Veículo', 'Colaborador', 'Matrícula',
      'Origem', 'Destino', 'KM Saída', 'KM Chegada', 'KM Percorridos', 'Status',
      'Obs. Saída', 'Obs. Chegada',
    ]
    const rows = trips.map(t => {
      const v = t.vehicle as any
      const c = t.collaborator as any
      const o = (t.origin_branch as any) ?? v?.branch
      const d = t.destination_branch as any
      return [
        format(new Date(t.departed_at), 'dd/MM/yyyy HH:mm'),
        t.arrived_at ? format(new Date(t.arrived_at), 'dd/MM/yyyy HH:mm') : '',
        v ? `${v.plate} ${v.brand} ${v.model}` : '',
        c?.name ?? '',
        c?.badge_number ?? '',
        o ? `${o.name} - ${o.city}` : '',
        d ? `${d.name} - ${d.city}` : (t.destination_description ?? ''),
        t.km_departure,
        t.km_arrival ?? '',
        t.km_driven ?? '',
        t.status === 'open' ? 'Em andamento' : 'Concluída',
        t.notes_departure ?? '',
        t.notes_arrival ?? '',
      ]
    })

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-frota-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">
          Histórico <span className="text-slate-400 font-normal text-base">({trips.length})</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={trips.length === 0}
            className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              hasActiveFilters
                ? 'bg-blue-700 border-blue-700 text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros{hasActiveFilters ? ' •' : ''}
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-slate-800">{trips.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Viagens</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-700">{closedCount}</p>
          <p className="text-xs text-green-600 mt-0.5">Concluídas</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{totalKm.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-blue-600 mt-0.5">KM total</p>
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Filtros</span>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'open', 'closed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter('status', f)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                    filters.status === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'open' ? 'Em aberto' : 'Concluídas'}
                </button>
              ))}
            </div>
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">De</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilter('dateFrom', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Até</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilter('dateTo', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* Veículo */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Veículo</label>
            <select
              value={filters.vehicleId}
              onChange={e => setFilter('vehicleId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white"
            >
              <option value="">Todos os veículos</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
              ))}
            </select>
          </div>

          {/* Colaborador */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Colaborador</label>
            <select
              value={filters.collaboratorId}
              onChange={e => setFilter('collaboratorId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white"
            >
              <option value="">Todos os colaboradores</option>
              {collaborators.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.badge_number})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Lista de viagens */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && trips.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Route className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Nenhuma viagem encontrada.</p>
          {hasActiveFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-3 text-sm text-blue-600 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {!loading && trips.length > 0 && (
        <div className="space-y-2">
          {trips.map(trip => {
            const isOpen = trip.status === 'open'
            const isExpanded = expanded === trip.id
            const vehicle = trip.vehicle as any
            const collaborator = trip.collaborator as any
            const origin = (trip.origin_branch as any) ?? vehicle?.branch
            const dest = trip.destination_branch as any

            return (
              <div key={trip.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Linha resumo */}
                <button className="w-full text-left p-3" onClick={() => setExpanded(isExpanded ? null : trip.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isOpen ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {vehicle?.plate} — {vehicle?.model}
                        </p>
                        <p className="text-xs text-slate-500">{collaborator?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOpen ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {isOpen ? 'Em uso' : 'Concluída'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 ml-4">
                    <p className="text-xs text-slate-400">
                      {format(new Date(trip.departed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {origin && ` · ${origin.name}`}{dest && ` → ${dest.name}`}
                    </p>
                    {trip.km_driven != null && trip.km_driven > 0 && (
                      <p className="text-xs font-semibold text-blue-700">{trip.km_driven} km</p>
                    )}
                  </div>
                </button>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-100 space-y-3 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <InfoItem icon={Gauge} label="KM saída" value={`${trip.km_departure} km`} />
                      {trip.km_arrival != null && <InfoItem icon={Gauge} label="KM chegada" value={`${trip.km_arrival} km`} />}
                      {trip.km_driven != null && <InfoItem icon={Gauge} label="KM percorridos" value={`${trip.km_driven} km`} highlight />}
                      {trip.arrived_at && (
                        <InfoItem icon={CheckCircle} label="Devolvido em"
                          value={format(new Date(trip.arrived_at), "dd/MM HH:mm", { locale: ptBR })} />
                      )}
                      {origin && <InfoItem icon={MapPin} label="Origem" value={`${origin.name} — ${origin.city}`} />}
                      {dest && <InfoItem icon={MapPin} label="Destino" value={`${dest.name} — ${dest.city}`} />}
                    </div>

                    {trip.notes_departure && (
                      <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600">
                        <span className="font-medium">Obs. saída:</span> {trip.notes_departure}
                      </div>
                    )}
                    {trip.notes_arrival && (
                      <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600">
                        <span className="font-medium">Obs. chegada:</span> {trip.notes_arrival}
                      </div>
                    )}

                    {trip.photos_departure.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
                          <Camera className="w-3 h-3" /> Fotos saída ({trip.photos_departure.length})
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {trip.photos_departure.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={url} alt={`Saída ${i + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer"
                              onClick={() => window.open(url, '_blank')} />
                          ))}
                        </div>
                      </div>
                    )}

                    {trip.photos_arrival.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
                          <Camera className="w-3 h-3" /> Fotos chegada ({trip.photos_arrival.length})
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {trip.photos_arrival.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={url} alt={`Chegada ${i + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer"
                              onClick={() => window.open(url, '_blank')} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InfoItem({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value: string; highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${highlight ? 'text-blue-600' : 'text-slate-400'}`} />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm font-medium ${highlight ? 'text-blue-700' : 'text-slate-700'}`}>{value}</p>
      </div>
    </div>
  )
}
