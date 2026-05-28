'use client'

import { useState } from 'react'
import { Eye, EyeOff, CheckCircle, KeyRound, User, Mail, BadgeCheck, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function ContaPage() {
  const { user, collaborator } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('Erro ao atualizar a senha. Tente novamente.')
      return
    }
    setDone(true)
    setPassword('')
    setConfirm('')
  }

  const initial = collaborator?.name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="max-w-sm mx-auto pt-4 space-y-4">

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-blue-700 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">{initial}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-base leading-tight">
              {collaborator?.name ?? '—'}
            </p>
            {collaborator?.badge_number && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                #{collaborator.badge_number}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{user?.email ?? '—'}</span>
          </div>
          {collaborator?.badge_number && (
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <BadgeCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Matrícula {collaborator.badge_number}</span>
            </div>
          )}
          {(collaborator?.branch as any)?.name && (
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{(collaborator?.branch as any).name}{(collaborator?.branch as any).city ? ` — ${(collaborator?.branch as any).city}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Alterar senha</h2>
        </div>

        {done ? (
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">Senha atualizada!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sua nova senha já está ativa.</p>
            <button
              onClick={() => setDone(false)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Alterar novamente
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Nova senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 pr-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Confirmar nova senha</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
