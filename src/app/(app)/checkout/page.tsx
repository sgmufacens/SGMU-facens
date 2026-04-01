'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Car, MapPin, User, Gauge, CheckCircle, Lock, ChevronRight, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PhotoCapture } from '@/components/PhotoCapture'
import { useAuth } from '@/context/AuthContext'
import type { Vehicle, Branch, Schedule } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const schema = z.object({
  vehicle_id: z.string().min(1, 'Selecione um veículo'),
  origin_branch_id: z.string().min(1, 'Informe a origem'),
  collaborator_id: z.string().min(1, 'Informe o colaborador'),
  destination_branch_id: z.string().optional(),
  destination_description: z.string().optional(),
  km_departure: z.coerce.number().min(0, 'KM inválido'),
  notes_departure: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type Step = 'vehicle' | 'details' | 'photos' | 'confirm'
const STEPS: Step[] = ['vehicle', 'details', 'photos', 'confirm']

function CheckoutPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scheduleId = searchParams.get('schedule_id')
  const { collaborator: currentUser } = useAuth()

  const [step, setStep] = useState<Step>('vehicle')
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set())
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [kmPhotos, setKmPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [registrationId, setRegistrationId] = useState('')
  const [scheduleVehicle, setScheduleVehicle] = useState<Vehicle | null>(null)
  const [scheduleData, setScheduleData] = useState<Schedule | null>(null)
  const [scheduleError, setScheduleError] = useState('')
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, watch, trigger, setValue, formState: { errors } } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema) as any,
  })

  const selectedVehicleId = watch('vehicle_id')
  const selectedVehicle = scheduleVehicle ?? vehicles.find(v => v.id === selectedVehicleId)
  const selectedOriginId = watch('origin_branch_id')
  const selectedOrigin = branches.find(b => b.id === selectedOriginId)

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: b }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('status', 'available').order('plate'),
        supabase.from('branches').select('*').order('name'),
      ])
      setVehicles(v ?? [])
      setBranches(b ?? [])

      if (scheduleId) {
        const { data: sched } = await supabase
          .from('schedules')
          .select('*, vehicle:vehicles(*)')
          .eq('id', scheduleId)
          .single()

        if (sched) {
          const vehicle = sched.vehicle as any
          if (vehicle?.status !== 'available') {
            setScheduleError('O veículo agendado não está disponível no momento. Pode estar em uso ou em manutenção.')
            setLoading(false)
            return
          }
          setScheduleVehicle(vehicle)
          setScheduleData(sched)
          setValue('vehicle_id', sched.vehicle_id)
          if (sched.origin_branch_id) setValue('origin_branch_id', sched.origin_branch_id)
          if (sched.destination_branch_id) setValue('destination_branch_id', sched.destination_branch_id)
          if (sched.destination_description) setValue('destination_description', sched.destination_description)
          setCompletedSteps(new Set(['vehicle']))
          setStep('details')
        } else {
          setScheduleError('Agendamento não encontrado.')
        }
      }

      setLoading(false)
    }
    load()
  }, [scheduleId])

  useEffect(() => {
    if (currentUser) {
      setValue('collaborator_id', currentUser.id)
    }
  }, [currentUser])

  function markComplete(s: Step) {
    setCompletedSteps(prev => new Set([...prev, s]))
  }

  async function goToStep(target: Step) {
    const targetIdx = STEPS.indexOf(target)
    const currentIdx = STEPS.indexOf(step)
    if (targetIdx <= currentIdx) {
      setStep(target)
    }
  }

  async function advanceFromVehicle() {
    const valid = await trigger('vehicle_id')
    if (!valid || !selectedVehicleId) return
    markComplete('vehicle')
    setStep('details')
  }

  async function advanceFromDetails() {
    const valid = await trigger(['origin_branch_id', 'collaborator_id', 'km_departure'])
    if (!valid) return
    markComplete('details')
    setStep('photos')
  }

  function advanceFromPhotos() {
    if (photos.length === 0) { alert('Adicione ao menos 1 foto do veículo.'); return }
    if (kmPhotos.length === 0) { alert('Adicione a foto do odômetro/KM.'); return }
    markComplete('photos')
    setStep('confirm')
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true)
    try {
      const allPhotos = [...photos, ...kmPhotos]
      const uploadedUrls: string[] = []

      for (const photoB64 of allPhotos) {
        const blob = await (await fetch(photoB64)).blob()
        const fileName = `checkout/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { data: uploaded, error } = await supabase.storage.from('fleet-photos').upload(fileName, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('fleet-photos').getPublicUrl(uploaded.path)
        uploadedUrls.push(publicUrl)
      }

      const { data: trip, error: tripError } = await supabase.from('trips').insert({
        vehicle_id: data.vehicle_id,
        collaborator_id: data.collaborator_id,
        origin_branch_id: data.origin_branch_id || null,
        destination_branch_id: data.destination_branch_id || null,
        destination_description: data.destination_description || null,
        km_departure: data.km_departure,
        photos_departure: uploadedUrls,
        notes_departure: data.notes_departure || null,
        departed_at: new Date().toISOString(),
        status: 'open',
      }).select().single()

      if (tripError) throw tripError
      const { error: vehicleError } = await supabase.from('vehicles').update({ status: 'in_use' }).eq('id', data.vehicle_id)
      if (vehicleError) throw vehicleError

      if (scheduleId) {
        await supabase.from('schedules').update({ status: 'completed' }).eq('id', scheduleId)
      }

      setRegistrationId(trip.id.slice(0, 8).toUpperCase())
      setDone(true)
    } catch (err) {
      console.error(err)
      alert('Erro ao registrar retirada. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center mt-16"><div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (scheduleError) {
    return (
      <div className="space-y-4 mt-4">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">Retirada de veículo</h1>
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-800 dark:text-amber-400 text-sm">
          <p className="font-semibold mb-1">Veículo indisponível</p>
          <p>{scheduleError}</p>
        </div>
        <button onClick={() => router.push('/schedules')} className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Voltar aos agendamentos
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Retirada registrada!</h1>
        <p className="text-slate-500 dark:text-slate-400">Registro <span className="font-mono font-semibold">#{registrationId}</span> criado com sucesso.</p>
        {selectedVehicle && <p className="text-sm text-slate-400 dark:text-slate-500">{selectedVehicle.plate} — {selectedVehicle.model}</p>}
        {scheduleId && <p className="text-xs text-green-600 dark:text-green-400 font-medium">Agendamento concluído ✓</p>}
        <button onClick={() => router.push('/dashboard')} className="mt-4 bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium">
          Voltar ao início
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">Retirada de veículo</h1>
        {scheduleData && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            Via agendamento de {format(new Date(scheduleData.scheduled_departure), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </div>
        )}
        <StepIndicator current={step} completed={completedSteps} onNavigate={goToStep} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Step 1: Vehicle ── */}
        {step === 'vehicle' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Car className="w-4 h-4" /> Selecione o veículo</h2>
            {vehicles.length === 0
              ? <p className="text-slate-500 dark:text-slate-400 text-sm bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">Nenhum veículo disponível no momento.</p>
              : vehicles.map(v => (
                <label key={v.id} className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${selectedVehicleId === v.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                  <input type="radio" value={v.id} {...register('vehicle_id')} className="accent-blue-700" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{v.plate}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{v.brand} {v.model} · {v.year} · {v.color}</p>
                  </div>
                </label>
              ))
            }
            {errors.vehicle_id && <p className="text-red-500 dark:text-red-400 text-sm">{errors.vehicle_id.message}</p>}
            <button type="button" onClick={advanceFromVehicle} disabled={!selectedVehicleId}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === 'details' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><User className="w-4 h-4" /> Informações da viagem</h2>

            {scheduleVehicle && (
              <div className="flex items-center gap-3 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{scheduleVehicle.plate}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{scheduleVehicle.brand} {scheduleVehicle.model} · {scheduleVehicle.year} · {scheduleVehicle.color}</p>
                </div>
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-600" /> Origem (de onde está saindo) <span className="text-red-500">*</span>
              </label>
              <select {...register('origin_branch_id')} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800">
                <option value="">Selecione a filial de origem...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
              </select>
              {errors.origin_branch_id && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.origin_branch_id.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Colaborador
              </label>
              <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2.5">
                <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-700 dark:text-blue-400 font-semibold text-xs">{currentUser?.name?.charAt(0) ?? '?'}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{currentUser?.name ?? 'Carregando...'}</p>
                  {currentUser?.badge_number && <p className="text-xs text-slate-500 dark:text-slate-400">Setor: {currentUser.badge_number}</p>}
                </div>
              </div>
              <input type="hidden" {...register('collaborator_id')} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500" /> Destino (filial)
              </label>
              <select {...register('destination_branch_id')} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800">
                <option value="">Selecione a filial de destino...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Destino (descrição livre)</label>
              <input {...register('destination_description')} placeholder="Ex: Reunião cliente, entrega..." className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> KM atual do veículo <span className="text-red-500">*</span>
              </label>
              <input type="number" {...register('km_departure')} placeholder="Ex: 45230" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
              {errors.km_departure && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.km_departure.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Observações</label>
              <textarea {...register('notes_departure')} rows={3} placeholder="Alguma observação sobre o veículo ou viagem..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
            </div>

            <div className="flex gap-3">
              {!scheduleVehicle && (
                <button type="button" onClick={() => setStep('vehicle')} className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300">Voltar</button>
              )}
              {scheduleVehicle && (
                <button type="button" onClick={() => router.push('/schedules')} className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300">Cancelar</button>
              )}
              <button type="button" onClick={advanceFromDetails}
                className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Photos ── */}
        {step === 'photos' && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Car className="w-4 h-4" /> Fotos do veículo</h2>
            <PhotoCapture label="Fotos do veículo (frente, traseira, laterais)" photos={photos} onChange={setPhotos} maxPhotos={6} required />
            <PhotoCapture label="Foto do odômetro / KM" photos={kmPhotos} onChange={setKmPhotos} maxPhotos={1} required />
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('details')} className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300">Voltar</button>
              <button type="button" onClick={advanceFromPhotos}
                className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                Revisar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300">Confirmar retirada</h2>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2 text-sm">
              <Row label="Veículo" value={`${selectedVehicle?.plate} — ${selectedVehicle?.brand} ${selectedVehicle?.model}`} />
              <Row label="Colaborador" value={currentUser?.name ?? '—'} />
              <Row label="Origem" value={selectedOrigin ? `${selectedOrigin.name} — ${selectedOrigin.city}` : '—'} />
              <Row label="Fotos" value={`${photos.length + kmPhotos.length} foto(s) registrada(s)`} />
              <Row label="Data/hora" value={new Date().toLocaleString('pt-BR')} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Ao confirmar, o veículo será marcado como <strong>em uso</strong>.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('photos')} className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300">Voltar</button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">
                {submitting ? 'Registrando...' : 'Confirmar retirada'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center mt-16"><div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" /></div>}>
      <CheckoutPageContent />
    </Suspense>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100 text-right">{value}</span>
    </div>
  )
}

function StepIndicator({ current, completed, onNavigate }: {
  current: Step
  completed: Set<Step>
  onNavigate: (s: Step) => void
}) {
  const steps: { key: Step; label: string }[] = [
    { key: 'vehicle', label: 'Veículo' },
    { key: 'details', label: 'Dados' },
    { key: 'photos',  label: 'Fotos' },
    { key: 'confirm', label: 'Confirmar' },
  ]
  const currentIdx = STEPS.indexOf(current)

  return (
    <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
      {steps.map(({ key, label }, i) => {
        const isDone = completed.has(key)
        const isCurrent = key === current
        const isLocked = i > currentIdx && !isDone
        return (
          <div key={key} className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => !isLocked && onNavigate(key)}
              disabled={isLocked}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                isCurrent ? 'bg-blue-700 text-white' :
                isDone ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60' :
                'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : isDone && !isCurrent ? <CheckCircle className="w-3 h-3" /> : <span>{i + 1}</span>}
              {label}
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}
