'use client'

import { useRef, useState } from 'react'
import { Camera, X, Image } from 'lucide-react'

interface PhotoCaptureProps {
  label: string
  photos: string[]
  onChange: (photos: string[]) => void
  maxPhotos?: number
  required?: boolean
}

export function PhotoCapture({ label, photos, onChange, maxPhotos = 4, required }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX = 1024
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width > height) { height = (height / width) * MAX; width = MAX }
            else { width = (width / height) * MAX; height = MAX }
          }
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.82))
        }
        img.src = e.target!.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setCompressing(true)
    const compressed = await Promise.all(files.slice(0, maxPhotos - photos.length).map(compressImage))
    onChange([...photos, ...compressed])
    setCompressing(false)
    e.target.value = ''
  }

  function remove(idx: number) {
    onChange(photos.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        <span className="text-slate-400 dark:text-slate-500 font-normal">({photos.length}/{maxPhotos})</span>
      </label>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((src, idx) => (
          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={compressing}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            {compressing ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-xs">Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {required && photos.length === 0 && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <Image className="w-3 h-3" /> Pelo menos 1 foto é obrigatória
        </p>
      )}
    </div>
  )
}
