'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Car, Users, Clock, Calendar, CheckCircle, Wrench, AlertTriangle, Siren, MapPin, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Vehicle, Trip, Schedule } from '@/types'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Alert = {
  id: string
  type: 'sos' | 'vehicle_breakdown' | 'other'
  notes: string | null
  lat: number | null
  lng: number | null
  status: 'open' | 'resolved'
  created_at: string
  collaborator: { name: string; phone: string | null } | null
  vehicle: { plate: string; model: string } | null
}

interface VehicleWithTrip extends Vehicle {
  activeTrip?: Trip & { collaborator?: { name: string; badge_number: string } }
}

export default function AdminDashboardPage() {
  const [vehicles, setVehicles] = useState<VehicleWithTrip[]>([])
  const [schedulesToday, setSchedulesToday] = useState<Schedule[]>([])
  const [openAlerts, setOpenAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const alertPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [{ data: vData }, { data: tData }, { data: sData }, { data: aData }] = await Promise.all([
      supabase.from('vehicles').select('*, branch:branches(name,city)').order('plate'),
      supabase.from('trips')
        .select('*, collaborator:collaborators(name,badge_number)')
        .eq('status', 'open'),
      supabase.from('schedules')
        .select('*, vehicle:vehicles(plate,brand,model), collaborator:collaborators(name,badge_number)')
        .in('status', ['confirmed'])
        .gte('scheduled_departure', todayStart.toISOString())
        .lte('scheduled_departure', todayEnd.toISOString())
        .order('scheduled_departure', { ascending: true }),
      supabase.from('alerts')
        .select('*, collaborator:collaborators(name,phone), vehicle:vehicles(plate,model)')
        .eq('status', 'open')
        .order('created_at', { ascending: false }),
    ])

    // Mescla viagens ativas nos veículos
    const tripsMap = new Map<string, any>()
    for (const t of tData ?? []) tripsMap.set(t.vehicle_id, t)

    const merged: VehicleWithTrip[] = (vData ?? []).map(v => ({
      ...v,
      activeTrip: tripsMap.get(v.id),
    }))

    setVehicles(merged)
    setSchedulesToday(sData ?? [])
    setOpenAlerts((aData ?? []) as Alert[])
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  // Polling de alertas a cada 10s (fallback caso Realtime não esteja ativo)
  const pollAlerts = useCallback(async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*, collaborator:collaborators(name,phone), vehicle:vehicles(plate,model)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (data) setOpenAlerts(data as Alert[])
  }, [])

  // Carga inicial
  useEffect(() => { load() }, [load])

  // Polling de alertas a cada 5s — independente do Realtime
  useEffect(() => {
    alertPollRef.current = setInterval(pollAlerts, 5_000)
    return () => { if (alertPollRef.current) clearInterval(alertPollRef.current) }
  }, [pollAlerts])

  // Supabase Realtime — canal separado para alertas evita conflito com outros handlers
  useEffect(() => {
    const alertChannel = supabase
      .channel('admin-alerts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => pollAlerts())
      .subscribe()

    return () => { supabase.removeChannel(alertChannel) }
  }, [pollAlerts])

  // Supabase Realtime — frota
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function resolveAlert(id: string) {
    await supabase.from('alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id)
    setOpenAlerts(prev => prev.filter(a => a.id !== id))
  }

  const counts = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    in_use: vehicles.filter(v => v.status === 'in_use').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
  }

  const now = new Date()

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Alertas abertos (SOS / Problema de veículo) ── */}
      {openAlerts.length > 0 && (
        <section className="space-y-2">
          {openAlerts.map(alert => {
            const isSos = alert.type === 'sos'
            const phone = alert.collaborator?.phone
            return (
              <div key={alert.id} className={`border-2 rounded-xl p-4 ${
                isSos
                  ? 'bg-red-50 border-red-400 dark:bg-red-900/30 dark:border-red-600'
                  : 'bg-amber-50 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600'
              }`}>
                {/* Cabeçalho */}
                <div className="flex items-center gap-2">
                  {isSos
                    ? <Siren className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 animate-pulse" />
                    : <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />}
                  <p className={`font-bold text-sm ${isSos ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {isSos ? 'SOS — Emergência' : 'Problema com veículo'}
                  </p>
                  <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>

                {/* Colaborador + veículo */}
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-2">
                  <span className="font-semibold">{alert.collaborator?.name ?? 'Colaborador'}</span>
                  {alert.vehicle && <span className="text-slate-500 dark:text-slate-400"> · {alert.vehicle.plate} {alert.vehicle.model}</span>}
                </p>

                {alert.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic bg-white/60 dark:bg-black/20 rounded-lg px-2.5 py-1.5">"{alert.notes}"</p>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Ligar — {phone}
                    </a>
                  )}
                  {alert.lat && alert.lng && (
                    <a
                      href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-800 px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Ver no mapa
                    </a>
                  )}
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="ml-auto flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Resolver
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Ao vivo · {format(lastUpdated, 'HH:mm:ss')}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{counts.total}</p>
            <p className="text-xs text-slate-500">Total de veículos</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-700">{schedulesToday.length}</p>
            <p className="text-xs text-slate-500">Agendamentos hoje</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">{counts.available}</p>
            <p className="text-xs text-green-600">Disponíveis</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{counts.in_use}</p>
            <p className="text-xs text-amber-600">Em uso agora</p>
          </div>
        </div>
      </div>

      {/* Status da frota */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Status da frota</h2>
        <div className="space-y-2">
          {vehicles.map(v => {
            const branch = v.branch as any
            const trip = v.activeTrip
            const driver = trip?.collaborator as any
            const departedAt = trip ? new Date(trip.departed_at) : null

            return (
              <div key={v.id} className={`bg-white border rounded-xl p-3 flex items-center gap-3 ${
                v.status === 'in_use' ? 'border-amber-200' :
                v.status === 'maintenance' ? 'border-red-200' :
                'border-slate-200'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  v.status === 'available' ? 'bg-green-500' :
                  v.status === 'in_use' ? 'bg-amber-500' :
                  'bg-red-500'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{v.plate}</p>
                    <p className="text-xs text-slate-500">{v.brand} {v.model} · {v.year}</p>
                  </div>
                  {branch && <p className="text-xs text-slate-400">{branch.name} — {branch.city}</p>}

                  {v.status === 'in_use' && driver && departedAt && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                      <Users className="w-3 h-3" />
                      <span className="font-medium">{driver.name}</span>
                      <span className="text-amber-400">·</span>
                      <span>{formatDistanceToNow(departedAt, { addSuffix: false, locale: ptBR })}</span>
                    </div>
                  )}

                  {v.status === 'maintenance' && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <Wrench className="w-3 h-3" />
                      <span>Em manutenção</span>
                    </div>
                  )}
                </div>

                <StatusBadge status={v.status} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Agendamentos de hoje */}
      {schedulesToday.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Agendamentos hoje ({schedulesToday.length})
          </h2>
          <div className="space-y-2">
            {schedulesToday.map(s => {
              const vehicle = s.vehicle as any
              const collaborator = s.collaborator as any
              const dep = new Date(s.scheduled_departure)
              const isPast = dep < now

              return (
                <div key={s.id} className={`bg-white border rounded-xl p-3 flex items-start justify-between gap-2 ${
                  isPast ? 'border-slate-200 opacity-60' : 'border-blue-200'
                }`}>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {vehicle?.plate} — {vehicle?.brand} {vehicle?.model}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                      <Users className="w-3 h-3" />
                      <span>{collaborator?.name}</span>
                      <span className="text-slate-300">·</span>
                      <span>{collaborator?.badge_number}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${isPast ? 'text-slate-400' : 'text-blue-700'}`}>
                      {format(dep, 'HH:mm')}
                    </p>
                    {isPast && <p className="text-xs text-slate-400">passou</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Aviso de manutenção */}
      {counts.maintenance > 0 && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-red-700">
            <span className="font-semibold">{counts.maintenance} veículo{counts.maintenance > 1 ? 's' : ''}</span>{' '}
            em manutenção e indisponível{counts.maintenance > 1 ? 'eis' : ''} para uso.
          </p>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    available: { label: 'Disponível', className: 'bg-green-100 text-green-700' },
    in_use: { label: 'Em uso', className: 'bg-amber-100 text-amber-700' },
    maintenance: { label: 'Manutenção', className: 'bg-red-100 text-red-700' },
  }
  const { label, className } = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-700' }
  return <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${className}`}>{label}</span>
}
