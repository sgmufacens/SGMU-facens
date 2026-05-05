'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Navigation, MapPin, Square, AlertTriangle, Wifi, WifiOff, Clock, Siren, Wrench, X, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { RoutePoint, RouteLayer } from '@/components/RouteMap'

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false })

type ActiveTrip = {
  id: string
  departed_at: string
  km_departure: number
  vehicle: { id: string; plate: string; model: string; brand: string }
}

type AlertFeedback = { type: 'sos' | 'vehicle_breakdown'; sent: boolean }

const GPS_INTERVAL_MS = 10_000
const ROUTE_COLOR = '#1d4ed8'

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 8000, maximumAge: 0,
    })
  )
}

export default function RondaPage() {
  const { collaborator } = useAuth()
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null)
  const [points, setPoints] = useState<RoutePoint[]>([])
  const [tracking, setTracking] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [lastPoint, setLastPoint] = useState<RoutePoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState('')

  // Alert states
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [breakdownNotes, setBreakdownNotes] = useState('')
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertFeedback, setAlertFeedback] = useState<AlertFeedback | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadTripData = useCallback(async () => {
    if (!collaborator) return
    const { data: trip } = await supabase
      .from('trips')
      .select('id, departed_at, km_departure, vehicle:vehicles(id, plate, model, brand)')
      .eq('collaborator_id', collaborator.id)
      .eq('status', 'open')
      .maybeSingle()

    if (trip) {
      setActiveTrip(trip as unknown as ActiveTrip)
      const { data: pts } = await supabase
        .from('route_points')
        .select('lat, lng, recorded_at')
        .eq('trip_id', trip.id)
        .order('recorded_at', { ascending: true })
      setPoints(pts ?? [])
    }
    setLoading(false)
  }, [collaborator])

  useEffect(() => { loadTripData() }, [loadTripData])

  useEffect(() => {
    if (!activeTrip) return
    function tick() {
      const diff = Date.now() - new Date(activeTrip!.departed_at).getTime()
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    clockRef.current = setInterval(tick, 1000)
    return () => { if (clockRef.current) clearInterval(clockRef.current) }
  }, [activeTrip])

  const captureAndSave = useCallback(async (tripId: string) => {
    if (!navigator.geolocation) { setGpsError('GPS não disponível neste dispositivo.'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsError(null)
        const point: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          recorded_at: new Date().toISOString(),
        }
        await supabase.from('route_points').insert({
          trip_id: tripId, lat: point.lat, lng: point.lng, recorded_at: point.recorded_at,
        })
        setPoints(prev => [...prev, point])
        setLastPoint(point)
      },
      (err) => setGpsError(`Erro de GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }, [])

  function startTracking() {
    if (!activeTrip) return
    setTracking(true)
    captureAndSave(activeTrip.id)
    intervalRef.current = setInterval(() => captureAndSave(activeTrip.id), GPS_INTERVAL_MS)
  }

  function stopTracking() {
    setTracking(false)
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (clockRef.current) clearInterval(clockRef.current)
  }, [])

  async function sendAlert(type: 'sos' | 'vehicle_breakdown', notes?: string) {
    if (!activeTrip || !collaborator) return
    setSendingAlert(true)
    try {
      let lat: number | null = null
      let lng: number | null = null
      if (navigator.geolocation) {
        try {
          const pos = await getCurrentPosition()
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch { /* GPS indisponível, envia sem localização */ }
      }

      const { error: insertError } = await supabase.from('alerts').insert({
        trip_id: activeTrip.id,
        collaborator_id: collaborator.id,
        vehicle_id: activeTrip.vehicle.id,
        type,
        notes: notes || null,
        lat,
        lng,
        status: 'open',
      })

      if (insertError) throw insertError

      setAlertFeedback({ type, sent: true })
      setShowBreakdownModal(false)
      setBreakdownNotes('')
      setTimeout(() => setAlertFeedback(null), 5000)
    } catch (err) {
      console.error('Erro ao enviar alerta:', err)
      alert('Erro ao enviar alerta. Tente novamente.')
    } finally {
      setSendingAlert(false)
    }
  }

  const layers: RouteLayer[] = activeTrip
    ? [{ points, color: ROUTE_COLOR, label: `${activeTrip.vehicle.plate} — ${activeTrip.vehicle.brand} ${activeTrip.vehicle.model}` }]
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!activeTrip) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3 px-4">
        <Navigation className="w-12 h-12 text-slate-300" />
        <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhuma ronda ativa</p>
        <p className="text-sm text-slate-400">Retire um veículo primeiro para iniciar o rastreamento de rota.</p>
      </div>
    )
  }

  const { vehicle } = activeTrip

  return (
    <div className="space-y-4 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Em Ronda</h1>
        {tracking ? (
          <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Rastreando
          </span>
        ) : (
          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full">Pausado</span>
        )}
      </div>

      {/* Feedback de alerta enviado */}
      {alertFeedback?.sent && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm ${
          alertFeedback.type === 'sos'
            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
            : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
        }`}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          {alertFeedback.type === 'sos'
            ? 'SOS enviado! A central foi notificada com sua localização.'
            : 'Problema registrado! A central foi notificada.'}
        </div>
      )}

      {/* Info da viagem */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{vehicle.plate}</p>
            <p className="text-sm text-slate-500 truncate">{vehicle.brand} {vehicle.model}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-400 justify-end mb-0.5">
              <Clock className="w-3 h-3" /> Tempo
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-200 font-mono">{elapsed}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-0.5">Pontos coletados</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{points.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-0.5">KM inicial</p>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{activeTrip.km_departure.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Status GPS */}
      {gpsError && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2.5 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {gpsError}
        </div>
      )}

      {lastPoint && (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs px-3 py-2 rounded-xl">
          {tracking
            ? <Wifi className="w-3.5 h-3.5 text-green-500 shrink-0" />
            : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
          Último ponto: {new Date(lastPoint.recorded_at!).toLocaleTimeString('pt-BR')}
          &nbsp;·&nbsp;{lastPoint.lat.toFixed(5)}, {lastPoint.lng.toFixed(5)}
        </div>
      )}

      {/* Mapa */}
      <div className="h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <RouteMap layers={layers} followLatest={tracking} zoom={15} />
      </div>

      {/* Controle de rastreamento */}
      {!tracking ? (
        <button onClick={startTracking}
          className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3.5 rounded-xl transition-colors">
          <MapPin className="w-5 h-5" /> Iniciar rastreamento
        </button>
      ) : (
        <button onClick={stopTracking}
          className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl transition-colors">
          <Square className="w-4 h-4 fill-current" /> Pausar rastreamento
        </button>
      )}

      {/* Ações de emergência */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Ocorrências</p>
        <div className="grid grid-cols-2 gap-3">

          {/* SOS */}
          <button
            onClick={() => sendAlert('sos')}
            disabled={sendingAlert}
            className="flex flex-col items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors"
          >
            <Siren className="w-7 h-7" />
            <span className="text-sm">SOS Emergência</span>
          </button>

          {/* Problema no veículo */}
          <button
            onClick={() => setShowBreakdownModal(true)}
            disabled={sendingAlert}
            className="flex flex-col items-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors"
          >
            <Wrench className="w-7 h-7" />
            <span className="text-sm">Problema Veículo</span>
          </button>

        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        GPS coletado a cada 10 s · Mantenha o app aberto durante a ronda
      </p>

      {/* Modal — problema no veículo */}
      {showBreakdownModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-800 dark:text-slate-100">Problema com o veículo</h2>
              </div>
              <button onClick={() => setShowBreakdownModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Descreva o problema. Sua localização atual será registrada e enviada à central.
              </p>
              <textarea
                value={breakdownNotes}
                onChange={e => setBreakdownNotes(e.target.value)}
                rows={4}
                placeholder="Ex: Pneu furado, motor superaquecendo, veículo não liga..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowBreakdownModal(false)}
                  className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => sendAlert('vehicle_breakdown', breakdownNotes)}
                  disabled={sendingAlert || !breakdownNotes.trim()}
                  className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm transition-colors"
                >
                  {sendingAlert ? 'Enviando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
