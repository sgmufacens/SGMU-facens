'use client'

import { useEffect, useState, useCallback } from 'react'
import { Siren, Wrench, CheckCircle, Clock, MapPin, Phone, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type AlertRecord = {
  id: string
  type: 'sos' | 'vehicle_breakdown' | 'other'
  notes: string | null
  lat: number | null
  lng: number | null
  status: 'open' | 'resolved'
  resolved_at: string | null
  created_at: string
  collaborator: { id: string; name: string; phone: string | null } | null
  vehicle: { plate: string; model: string; brand: string } | null
}

type CollaboratorOption = { id: string; name: string }

const TYPE_LABEL: Record<string, string> = {
  sos: 'SOS Emergência',
  vehicle_breakdown: 'Problema de veículo',
  other: 'Outro',
}

export default function ChamadosPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([])
  const [loading, setLoading] = useState(true)

  const [filterCollab, setFilterCollab] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const load = useCallback(async () => {
    const [{ data: aData }, { data: cData }] = await Promise.all([
      supabase
        .from('alerts')
        .select('*, collaborator:collaborators(id, name, phone), vehicle:vehicles(plate, model, brand)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('collaborators').select('id, name').eq('is_active', true).order('name'),
    ])
    setAlerts((aData ?? []) as AlertRecord[])
    setCollaborators(cData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function resolveAlert(id: string) {
    await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
    setAlerts(prev =>
      prev.map(a => a.id === id ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() } : a)
    )
  }

  const filtered = alerts.filter(a => {
    if (filterCollab && a.collaborator?.id !== filterCollab) return false
    if (filterType && a.type !== filterType) return false
    if (filterStatus === 'open' && a.status !== 'open') return false
    if (filterStatus === 'resolved' && a.status !== 'resolved') return false
    return true
  })

  const openCount = alerts.filter(a => a.status === 'open').length

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Histórico de Chamados</h1>
          {openCount > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-0.5">
              {openCount} chamado{openCount > 1 ? 's' : ''} em aberto
            </p>
          )}
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={filterCollab}
            onChange={e => setFilterCollab(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Todos os colaboradores</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Todos os tipos</option>
            <option value="sos">SOS Emergência</option>
            <option value="vehicle_breakdown">Problema de veículo</option>
            <option value="other">Outro</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="all">Todos os status</option>
            <option value="open">Em aberto</option>
            <option value="resolved">Resolvidos</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhum chamado encontrado</p>
          <p className="text-sm text-slate-400">Ajuste os filtros ou aguarde novos registros.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const isSos = alert.type === 'sos'
            const isOpen = alert.status === 'open'
            const phone = alert.collaborator?.phone

            return (
              <div
                key={alert.id}
                className={`bg-white dark:bg-slate-800 border rounded-xl p-4 ${
                  isOpen && isSos
                    ? 'border-red-300 dark:border-red-700'
                    : isOpen
                    ? 'border-amber-300 dark:border-amber-700'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Topo: tipo + status + data */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isSos
                      ? <Siren className={`w-5 h-5 shrink-0 ${isOpen ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-slate-400'}`} />
                      : <Wrench className={`w-5 h-5 shrink-0 ${isOpen ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                    }
                    <div>
                      <p className={`font-bold text-sm ${
                        isOpen && isSos ? 'text-red-700 dark:text-red-300' :
                        isOpen ? 'text-amber-700 dark:text-amber-300' :
                        'text-slate-600 dark:text-slate-300'
                      }`}>
                        {TYPE_LABEL[alert.type]}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {' · '}
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                    isOpen
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {isOpen ? 'Em aberto' : 'Resolvido'}
                  </span>
                </div>

                {/* Colaborador + veículo */}
                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {alert.collaborator?.name ?? 'Colaborador desconhecido'}
                    </span>
                    {alert.vehicle && (
                      <span className="text-slate-400 dark:text-slate-500">
                        {' · '}{alert.vehicle.plate} {alert.vehicle.brand} {alert.vehicle.model}
                      </span>
                    )}
                  </div>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {phone}
                    </a>
                  )}
                </div>

                {/* Notas */}
                {alert.notes && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                    "{alert.notes}"
                  </p>
                )}

                {/* Rodapé: mapa + ações */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {alert.lat && alert.lng ? (
                      <a
                        href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <MapPin className="w-3 h-3" /> Ver localização
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Sem localização
                      </span>
                    )}

                    {!isOpen && alert.resolved_at && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Resolvido {formatDistanceToNow(new Date(alert.resolved_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Marcar resolvido
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
