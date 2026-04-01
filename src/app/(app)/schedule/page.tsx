'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Car, MapPin, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Vehicle, Branch } from '@/types'
import { format } from 'date-fns'

interface FormData {
  vehicle_id: string
  origin_branch_id: string
  destination_branch_id: string
  destination_description: string
  scheduled_departure: string
  estimated_return: string
  notes: string
}

export default function SchedulePage() {
  const router = useRouter()
  const { collaborator } = useAuth()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const defaultDeparture = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0)
  const defaultReturn = new Date(defaultDeparture.getTime() + 2 * 60 * 60 * 1000)

  const toInputValue = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")

  const [form, setForm] = useState<FormData>({
    vehicle_id: '',
    origin_branch_id: '',
    destination_branch_id: '',
    destination_description: '',
    scheduled_departure: toInputValue(defaultDeparture),
    estimated_return: toInputValue(defaultReturn),
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: b }] = await Promise.all([
        supabase.from('vehicles').select('*, branch:branches(name,city)').neq('status', 'maintenance').order('plate'),
        supabase.from('branches').select('*').order('name'),
      ])
      setVehicles(v ?? [])
      setBranches(b ?? [])

      if (collaborator?.branch_id) {
        setForm(f => ({ ...f, origin_branch_id: collaborator.branch_id! }))
      }
      setLoading(false)
    }
    load()
  }, [collaborator])

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!collaborator) {
      setError('Usuário não identificado. Faça login novamente.')
      return
    }
    if (!form.vehicle_id) { setError('Selecione um veículo.'); return }
    if (!form.scheduled_departure) { setError('Informe a data/hora de saída.'); return }

    const departure = new Date(form.scheduled_departure)
    if (departure <= new Date()) {
      setError('A data de saída deve ser no futuro.')
      return
    }
    if (form.estimated_return && new Date(form.estimated_return) <= departure) {
      setError('A previsão de retorno deve ser após a saída.')
      return
    }

    setSaving(true)

    const depIso = new Date(form.scheduled_departure).toISOString()
    const retIso = form.estimated_return
      ? new Date(form.estimated_return).toISOString()
      : new Date(new Date(form.scheduled_departure).getTime() + 8 * 60 * 60 * 1000).toISOString()

    const { data: conflicts } = await supabase
      .from('schedules')
      .select('id, collaborator:collaborators(name), scheduled_departure, estimated_return')
      .eq('vehicle_id', form.vehicle_id)
      .eq('status', 'confirmed')
      .lt('scheduled_departure', retIso)
      .or(`estimated_return.is.null,estimated_return.gt.${depIso}`)

    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0] as any
      const who = c.collaborator?.name ?? 'outro colaborador'
      const when = new Date(c.scheduled_departure).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      setError(`Veículo já agendado por ${who} a partir de ${when}. Escolha outro veículo ou horário.`)
      setSaving(false)
      return
    }

    const { error: err } = await supabase.from('schedules').insert({
      vehicle_id: form.vehicle_id,
      collaborator_id: collaborator.id,
      origin_branch_id: form.origin_branch_id || null,
      destination_branch_id: form.destination_branch_id || null,
      destination_description: form.destination_description || null,
      scheduled_departure: new Date(form.scheduled_departure).toISOString(),
      estimated_return: form.estimated_return ? new Date(form.estimated_return).toISOString() : null,
      notes: form.notes || null,
      status: 'confirmed',
    })

    if (err) {
      setError('Erro ao salvar agendamento: ' + err.message)
      setSaving(false)
      return
    }

    router.push('/schedules')
  }

  if (loading) return <div className="flex justify-center mt-16"><div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mt-2">
        <CalendarPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Novo Agendamento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Veículo */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Car className="w-4 h-4" /> Veículo
          </div>
          <select
            value={form.vehicle_id}
            onChange={e => set('vehicle_id', e.target.value)}
            required
            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">Selecione um veículo...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.brand} {v.model} {v.year} {v.color ? `(${v.color})` : ''}{v.status === 'in_use' ? ' [em uso]' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Origem / Destino */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <MapPin className="w-4 h-4" /> Trajeto
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Filial de origem</label>
            <select
              value={form.origin_branch_id}
              onChange={e => set('origin_branch_id', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="">Selecione...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Filial de destino</label>
            <select
              value={form.destination_branch_id}
              onChange={e => set('destination_branch_id', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="">Selecione...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Descrição do destino (opcional)</label>
            <input
              type="text"
              value={form.destination_description}
              onChange={e => set('destination_description', e.target.value)}
              placeholder="Ex: Reunião com cliente, Entrega de equipamentos..."
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Data/Hora */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4" /> Data e Hora
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Saída prevista *</label>
            <input
              type="datetime-local"
              value={form.scheduled_departure}
              onChange={e => set('scheduled_departure', e.target.value)}
              required
              min={toInputValue(new Date())}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Retorno previsto (opcional)</label>
            <input
              type="datetime-local"
              value={form.estimated_return}
              onChange={e => set('estimated_return', e.target.value)}
              min={form.scheduled_departure}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Observações (opcional)</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="Alguma observação sobre o uso do veículo..."
            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-700 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Agendar'}
          </button>
        </div>
      </form>
    </div>
  )
}
