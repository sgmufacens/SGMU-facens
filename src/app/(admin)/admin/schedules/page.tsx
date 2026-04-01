'use client'

import { useEffect, useState } from 'react'
import { Calendar, XCircle, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Schedule } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pendente',   className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Agendado', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelado',  className: 'bg-red-100 text-red-700' },
  completed: { label: 'Concluído',  className: 'bg-green-100 text-green-700' },
}

type Filter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('confirmed')
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    let query = supabase
      .from('schedules')
      .select('*, vehicle:vehicles(plate,brand,model,year,color), collaborator:collaborators(name,badge_number), origin_branch:branches!schedules_origin_branch_id_fkey(name,city), destination_branch:branches!schedules_destination_branch_id_fkey(name,city)')
      .order('scheduled_departure', { ascending: false })

    if (filter !== 'all') query = query.eq('status', filter)

    const { data } = await query
    setSchedules(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await supabase.from('schedules').update({ status }).eq('id', id)
    await load()
    setUpdating(null)
  }

  const filters: { value: Filter; label: string }[] = [
    { value: 'confirmed', label: 'Agendados' },
    { value: 'all',       label: 'Todos' },
    { value: 'cancelled', label: 'Cancelados' },
    { value: 'completed', label: 'Concluídos' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-800">Agendamentos</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => { setLoading(true); setFilter(f.value) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value ? 'bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && schedules.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Nenhum agendamento encontrado.</p>
        </div>
      )}

      <div className="space-y-3">
        {schedules.map(s => {
          const vehicle = s.vehicle as any
          const collaborator = s.collaborator as any
          const originBranch = s.origin_branch as any
          const destBranch = s.destination_branch as any
          const { label, className } = STATUS_MAP[s.status] ?? { label: s.status, className: 'bg-slate-100 text-slate-600' }
          const dep = new Date(s.scheduled_departure)

          return (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800">
                    {vehicle?.plate} — {vehicle?.brand} {vehicle?.model} {vehicle?.year}
                  </p>
                  <p className="text-sm text-slate-600">{collaborator?.name} <span className="text-slate-400">({collaborator?.badge_number})</span></p>
                  {(originBranch || destBranch) && (
                    <p className="text-sm text-slate-500">
                      {originBranch?.name ?? '—'} → {destBranch?.name ?? s.destination_description ?? '—'}
                    </p>
                  )}
                  {s.destination_description && !destBranch && (
                    <p className="text-sm text-slate-500">{s.destination_description}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${className}`}>{label}</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {format(dep, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {s.estimated_return && (
                    <> → {format(new Date(s.estimated_return), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                  )}
                </span>
              </div>

              {s.notes && <p className="text-xs text-slate-400 italic">"{s.notes}"</p>}

              {/* Actions */}
              {s.status === 'confirmed' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => updateStatus(s.id, 'completed')}
                    disabled={updating === s.id}
                    className="flex items-center gap-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Concluir
                  </button>
                  <button
                    onClick={() => updateStatus(s.id, 'cancelled')}
                    disabled={updating === s.id}
                    className="flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
