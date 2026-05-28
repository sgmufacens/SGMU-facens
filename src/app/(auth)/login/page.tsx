'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Eye, EyeOff, LogIn, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type View = 'login' | 'forgot' | 'forgot-sent'

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos. Verifique seus dados.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo })
    if (error) {
      setForgotError('Erro ao enviar e-mail. Verifique o endereço e tente novamente.')
      setForgotLoading(false)
      return
    }
    setView('forgot-sent')
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen bg-blue-900 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <Car className="w-8 h-8 text-blue-800 dark:text-blue-400" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">S.I.R.U</h1>
          <p className="text-blue-300 text-sm mt-1">Sistema Inteligente de Ronda Urbana</p>
        </div>

        {/* ── Login ── */}
        {view === 'login' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-lg mb-5 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-blue-700 dark:text-blue-400" /> Entrar
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setView('forgot') }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 pr-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        )}

        {/* ── Esqueci minha senha ── */}
        {view === 'forgot' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => setView('login')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-lg flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-700 dark:text-blue-400" /> Redefinir senha
              </h2>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoFocus
                  required
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {forgotError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2.5 rounded-xl">
                  {forgotError}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading || !forgotEmail}
                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {forgotLoading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
          </div>
        )}

        {/* ── E-mail enviado ── */}
        {view === 'forgot-sent' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-slate-800 dark:text-slate-100 font-bold text-lg">E-mail enviado!</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Verifique sua caixa de entrada em <span className="font-medium text-slate-700 dark:text-slate-300">{forgotEmail}</span> e clique no link para criar uma nova senha.
              </p>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Não recebeu? Verifique o spam ou tente novamente.
            </p>
            <button
              onClick={() => setView('login')}
              className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
