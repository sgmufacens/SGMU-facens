'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, RefreshCw, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RouteLayer } from '@/components/RouteMap'

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false })

type TripSummary = {
  id: string
  departed_at: string
  arrived_at: string | null
  status: 'open' | 'closed'
  collaborator: { name: string }
  vehicle: { plate: string; brand: string; model: string }
  route_points: { lat: number; lng: number; recorded_at: string }[]
}

// Paleta de cores para distinguir rotas no mapa
const COLORS = [
  '#1d4ed8', '#dc2626', '#16a34a', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#059669', '#ea580c', '#4338ca',
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function todayRange() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export default function AdminRotasPage() {
  const [trips, setTrips] = useState<TripSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(todayRange().start)
  const [dateTo, setDateTo] = useState(todayRange().end)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('trips')
      .select(`
        id, departed_at, arrived_at, status,
        collaborator:collaborators(name),
        vehicle:vehicles(plate, brand, model),
        route_points(lat, lng, recorded_at)
      `)
      .gte('departed_at', `${dateFrom}T00:00:00`)
      .lte('departed_at', `${dateTo}T23:59:59`)
      .order('departed_at', { ascending: false })

    setTrips((data as unknown as TripSummary[]) ?? [])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const visibleTrips = selectedTripId
    ? trips.filter(t => t.id === selectedTripId)
    : trips

  const layers: RouteLayer[] = visibleTrips
    .filter(t => t.route_points.length > 0)
    .map((t, i) => ({
      points: [...t.route_points].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      ),
      color: COLORS[i % COLORS.length],
      label: `${t.vehicle.plate} · ${t.collaborator.name}`,
    }))

  const totalPoints = trips.reduce((acc, t) => acc + t.route_points.length, 0)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">
          Rotas <span className="text-slate-400 font-normal text-base">({trips.length})</span>
        </h1>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-700 px-2 py-1.5 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Período
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Mapa geral */}
      <div className="h-80 rounded-xl overflow-hidden border border-slate-200">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : layers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-2 text-slate-400">
            <MapPin className="w-8 h-8" />
            <p className="text-sm">Nenhuma rota com pontos GPS no período</p>
          </div>
        ) : (
          <RouteMap layers={layers} zoom={13} />
        )}
      </div>

      {/* Legenda / resumo */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="grid grid-cols-3 gap-3 text-center border-b border-slate-100 pb-3 mb-3">
          <div>
            <p className="text-xs text-slate-400">Viagens</p>
            <p className="text-xl font-bold text-slate-700">{trips.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Com GPS</p>
            <p className="text-xl font-bold text-blue-700">{trips.filter(t => t.route_points.length > 0).length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Pontos totais</p>
            <p className="text-xl font-bold text-slate-700">{totalPoints}</p>
          </div>
        </div>

        {/* Lista de rotas */}
        <div className="space-y-2">
          {trips.length === 0 && !loading && (
            <p className="text-sm text-slate-400 text-center py-2">Nenhuma viagem no período selecionado.</p>
          )}
          {trips.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelectedTripId(prev => prev === t.id ? null : t.id)}
              className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                selectedTripId === t.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-100 hover:bg-slate-50'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: t.route_points.length > 0 ? COLORS[i % COLORS.length] : '#e2e8f0' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {t.vehicle.plate} · {t.collaborator.name}
                </p>
                <p className="text-xs text-slate-400">{formatDate(t.departed_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  t.status === 'open'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {t.status === 'open' ? 'Em ronda' : 'Concluída'}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">{t.route_points.length} pts</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
