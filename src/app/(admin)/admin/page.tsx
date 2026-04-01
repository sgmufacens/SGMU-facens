'use client'

import { useEffect, useState, useCallback } from 'react'
import { Car, Users, Clock, Calendar, CheckCircle, Wrench, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Vehicle, Trip, Schedule } from '@/types'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VehicleWithTrip extends Vehicle {
  activeTrip?: Trip & { collaborator?: { name: string; badge_number: string } }
}

export default function AdminDashboardPage() {
  const [vehicles, setVehicles] = useState<VehicleWithTrip[]>([])
  const [schedulesToday, setSchedulesToday] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const load = useCallback(async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [{ data: vData }, { data: tData }, { data: sData }] = await Promise.all([
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
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  // Carga inicial
  useEffect(() => { load() }, [load])

  // Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

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
