'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase troca o hash da URL por uma sessão automaticamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setInvalid(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Erro ao redefinir senha. O link pode ter expirado.')
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <div className="min-h-screen bg-blue-900 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <Car className="w-8 h-8 text-blue-800 dark:text-blue-400" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">S.I.R.U</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">

          {/* Link inválido ou expirado */}
          {invalid && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Link inválido ou expirado</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Solicite um novo link na tela de login.</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-medium"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {/* Aguardando sessão */}
          {!ready && !invalid && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Senha redefinida com sucesso */}
          {done && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Senha redefinida!</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Redirecionando para o login...</p>
            </div>
          )}

          {/* Formulário */}
          {ready && !done && (
            <>
              <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-lg mb-1">Nova senha</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Crie uma nova senha para sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoFocus
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
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Confirmar senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
