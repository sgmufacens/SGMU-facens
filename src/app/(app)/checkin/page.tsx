'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Car, Gauge, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PhotoCapture } from '@/components/PhotoCapture'
import type { Trip } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const schema = z.object({
  trip_id: z.string().min(1, 'Selecione a viagem'),
  km_arrival: z.coerce.number().min(0, 'KM inválido'),
  notes_arrival: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Step = 'select' | 'km' | 'photos' | 'confirm'

export default function CheckinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [trips, setTrips] = useState<Trip[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [kmPhotos, setKmPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [summary, setSummary] = useState({ kmDriven: 0, duration: '' })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData, any, FormData>({
    resolver: zodResolver(schema) as any,
  })

  const selectedTripId = watch('trip_id')
  const selectedTrip = trips.find(t => t.id === selectedTripId)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('trips')
        .select('*, vehicle:vehicles(plate,model,brand,year), collaborator:collaborators(name,badge_number)')
        .eq('status', 'open')
        .order('departed_at', { ascending: false })
      setTrips(data ?? [])
    }
    load()
  }, [])

  async function onSubmit(data: FormData) {
    if (!selectedTrip) return
    if (photos.length === 0) { alert('Adicione ao menos 1 foto do veículo.'); return }
    if (kmPhotos.length === 0) { alert('Adicione a foto do odômetro.'); return }
    if (data.km_arrival < selectedTrip.km_departure) {
      alert(`KM de chegada deve ser maior ou igual ao KM de saída (${selectedTrip.km_departure} km).`)
      return
    }

    setSubmitting(true)
    try {
      const allPhotos = [...photos, ...kmPhotos]
      const uploadedUrls: string[] = []

      for (const photoB64 of allPhotos) {
        const blob = await (await fetch(photoB64)).blob()
        const fileName = `checkin/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { data: uploaded, error } = await supabase.storage.from('fleet-photos').upload(fileName, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('fleet-photos').getPublicUrl(uploaded.path)
        uploadedUrls.push(publicUrl)
      }

      const arrivedAt = new Date().toISOString()

      const checkinRes = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: data.trip_id,
          vehicle_id: selectedTrip.vehicle_id,
          km_arrival: data.km_arrival,
          arrived_at: arrivedAt,
          photos_arrival: uploadedUrls,
          notes_arrival: data.notes_arrival || null,
        }),
      })
      if (!checkinRes.ok) {
        const json = await checkinRes.json()
        throw new Error(json.error ?? 'Erro ao registrar devolução')
      }

      const kmDriven = data.km_arrival - selectedTrip.km_departure
      const duration = formatDistanceToNow(new Date(selectedTrip.departed_at), { locale: ptBR })
      setSummary({ kmDriven, duration })
      setDone(true)
    } catch (err) {
      console.error(err)
      alert('Erro ao registrar devolução. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Devolução registrada!</h1>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">KM percorridos</span><span className="font-bold text-blue-700 dark:text-blue-400">{summary.kmDriven} km</span></div>
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Tempo de uso</span><span className="font-semibold text-slate-800 dark:text-slate-100">{summary.duration}</span></div>
        </div>
        <button onClick={() => router.push('/dashboard')} className="mt-4 bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium">
          Voltar ao início
        </button>
      </div>
    )
  }

  if (trips.length === 0 && step === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <Car className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Nenhuma viagem aberta</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Não há veículos em uso no momento.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm">Voltar</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-2">Devolução de veículo</h1>
        <StepIndicator current={step} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Select trip */}
        {step === 'select' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Car className="w-4 h-4" /> Qual veículo você está devolvendo?</h2>
            {trips.map(t => (
              <label key={t.id} className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${selectedTripId === t.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                <input type="radio" value={t.id} {...register('trip_id')} className="accent-blue-700 mt-1" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{(t.vehicle as any)?.plate} — {(t.vehicle as any)?.brand} {(t.vehicle as any)?.model}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{(t.collaborator as any)?.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Saiu {formatDistanceToNow(new Date(t.departed_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </label>
            ))}
            {errors.trip_id && <p className="text-red-500 dark:text-red-400 text-sm">{errors.trip_id.message}</p>}
            <button type="button" disabled={!selectedTripId} onClick={() => setStep('km')} className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium disabled:opacity-50">
              Continuar
            </button>
          </div>
        )}

        {/* Step 2: KM */}
        {step === 'km' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Gauge className="w-4 h-4" /> Quilometragem de chegada</h2>

            {selectedTrip && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-300">
                KM de saída: <strong>{selectedTrip.km_departure} km</strong>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">KM atual do veículo <span className="text-red-500">*</span></label>
              <input type="number" {...register('km_arrival')} placeholder="Ex: 45590" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-lg font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
              {errors.km_arrival && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.km_arrival.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Observações da chegada</label>
              <textarea {...register('notes_arrival')} rows={3} placeholder="Alguma ocorrência, dano ou observação..." className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('select')} className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300">Voltar</button>
              <button type="button" onClick={() => setStep('photos')} className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-medium">Continuar</button>
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 'photos' && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300">Fotos de devolução</h2>

            <PhotoCapture
              label="Fotos do veículo na chegada"
              photos={photos}
              onChange={setPhotos}
              maxPhotos={6}
              required
            />

            <PhotoCapture
              label="Foto do odômetro / KM chegada"
              photos={kmPhotos}
              onChange={setKmPhotos}
              maxPhotos={1}
              required
            />

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('km')} className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300">Voltar</button>
              <button
                type="button"
                onClick={() => {
                  if (photos.length === 0 || kmPhotos.length === 0) { alert('Adicione todas as fotos obrigatórias.'); return }
                  setStep('confirm')
                }}
                className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-medium"
              >
                Revisar
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-700 dark:text-slate-300">Confirmar devolução</h2>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2 text-sm">
              <Row label="Veículo" value={`${(selectedTrip?.vehicle as any)?.plate}`} />
              <Row label="Fotos registradas" value={`${photos.length + kmPhotos.length} foto(s)`} />
              <Row label="Data/hora" value={new Date().toLocaleString('pt-BR')} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Ao confirmar, o veículo voltará para <strong>disponível</strong>.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('photos')} className="flex-1 border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300">Voltar</button>
              <button type="submit" disabled={submitting} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">
                {submitting ? 'Registrando...' : 'Confirmar devolução'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['select', 'km', 'photos', 'confirm']
  const labels = ['Viagem', 'KM', 'Fotos', 'Confirmar']
  const idx = steps.indexOf(current)
  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium transition-colors ${i <= idx ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
            {i + 1}
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 w-6 ${i < idx ? 'bg-blue-700' : 'bg-slate-200 dark:bg-slate-700'}`} />}
        </div>
      ))}
      <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{labels[idx]}</span>
    </div>
  )
}
