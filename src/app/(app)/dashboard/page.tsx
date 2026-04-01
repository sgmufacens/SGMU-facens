'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Car, Clock, CheckCircle, Wrench, ArrowRight, Calendar, CalendarPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Vehicle, Trip, Schedule } from '@/types'
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Dashboard() {
  const { collaborator } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [activeTrips, setActiveTrips] = useState<Trip[]>([])
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const queries: PromiseLike<any>[] = [
      supabase.from('vehicles').select('*, branch:branches(name)').order('plate'),
      supabase.from('trips')
        .select('*, vehicle:vehicles(plate,model,brand), collaborator:collaborators(name,badge_number)')
        .eq('status', 'open')
        .order('departed_at', { ascending: false }),
    ]

    if (collaborator) {
      queries.push(
        supabase.from('schedules')
          .select('*, vehicle:vehicles(plate,brand,model), destination_branch:branches!schedules_destination_branch_id_fkey(name,city)')
          .eq('collaborator_id', collaborator.id)
          .in('status', ['pending', 'confirmed'])
          .gte('scheduled_departure', new Date().toISOString())
          .order('scheduled_departure', { ascending: true })
          .limit(3)
      )
    }

    const [{ data: v }, { data: t }, schedulesRes] = await Promise.all(queries)
    const vehicleList = v ?? []
    const inUseIds = new Set(vehicleList.filter((x: Vehicle) => x.status === 'in_use').map((x: Vehicle) => x.id))
    setVehicles(vehicleList)
    setActiveTrips((t ?? []).filter((trip: Trip) => inUseIds.has(trip.vehicle_id)))
    setUpcomingSchedules(schedulesRes?.data ?? [])
    setLoading(false)
  }, [collaborator])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const channel = supabase
      .channel('app-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  const counts = {
    available: vehicles.filter(v => v.status === 'available').length,
    in_use: vehicles.filter(v => v.status === 'in_use').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
  }

  if (loading) return <div className="flex justify-center mt-16"><div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Visão Geral da Frota</h1>
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Ao vivo
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{counts.available}</p>
          <p className="text-xs text-green-600 dark:text-green-400">Disponíveis</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{counts.in_use}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">Em uso</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
          <Wrench className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{counts.maintenance}</p>
          <p className="text-xs text-red-600 dark:text-red-400">Manutenção</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/checkout" className="bg-blue-700 text-white rounded-xl p-3 flex flex-col gap-2 active:bg-blue-800 transition-colors">
          <Car className="w-5 h-5" />
          <span className="font-semibold text-sm">Retirar</span>
          <ArrowRight className="w-4 h-4 self-end" />
        </Link>
        <Link href="/checkin" className="bg-slate-700 dark:bg-slate-600 text-white rounded-xl p-3 flex flex-col gap-2 active:bg-slate-800 transition-colors">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Devolver</span>
          <ArrowRight className="w-4 h-4 self-end" />
        </Link>
        <Link href="/schedule" className="bg-indigo-600 text-white rounded-xl p-3 flex flex-col gap-2 active:bg-indigo-700 transition-colors">
          <CalendarPlus className="w-5 h-5" />
          <span className="font-semibold text-sm">Agendar</span>
          <ArrowRight className="w-4 h-4 self-end" />
        </Link>
      </div>

      {/* Upcoming schedules */}
      {upcomingSchedules.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Meus agendamentos</h2>
            <Link href="/schedules" className="text-xs text-blue-700 dark:text-blue-400 font-medium">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {upcomingSchedules.map(s => {
              const vehicle = s.vehicle as any
              const destBranch = s.destination_branch as any
              const dep = new Date(s.scheduled_departure)
              const dayLabel = isToday(dep) ? 'Hoje' : isTomorrow(dep) ? 'Amanhã' : format(dep, "dd/MM", { locale: ptBR })
              return (
                <div key={s.id} className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{vehicle?.plate} — {vehicle?.brand} {vehicle?.model}</p>
                    {destBranch && <p className="text-xs text-slate-500 dark:text-slate-400">→ {destBranch.name}</p>}
                    {s.destination_description && !destBranch && <p className="text-xs text-slate-500 dark:text-slate-400">{s.destination_description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">{dayLabel}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(dep, 'HH:mm')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active trips */}
      {activeTrips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Viagens em andamento</h2>
          <div className="space-y-2">
            {activeTrips.map(trip => (
              <div key={trip.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {(trip.vehicle as any)?.plate} — {(trip.vehicle as any)?.model}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{(trip.collaborator as any)?.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {formatDistanceToNow(new Date(trip.departed_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-medium">em uso</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicles list */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Todos os veículos</h2>
        <div className="space-y-2">
          {vehicles.map(vehicle => (
            <div key={vehicle.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{vehicle.plate} — {vehicle.brand} {vehicle.model}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{vehicle.year} · {vehicle.color}</p>
              </div>
              <StatusBadge status={vehicle.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    available: { label: 'Disponível', className: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' },
    in_use: { label: 'Em uso', className: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' },
    maintenance: { label: 'Manutenção', className: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' },
  }
  const { label, className } = map[status] ?? { label: status, className: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' }
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${className}`}>{label}</span>
}
