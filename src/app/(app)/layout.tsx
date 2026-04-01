'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Car, LayoutDashboard, PlusCircle, LogOut, Calendar } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { collaborator, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-800 dark:bg-blue-900 text-white px-4 py-2.5 flex items-center gap-3 shadow-md">
        <Car className="w-5 h-5 shrink-0" />
        <span className="font-bold text-base tracking-tight">FleetControl</span>

        {collaborator && (
          <div className="ml-auto flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-white leading-none">{collaborator.name}</p>
              <p className="text-xs text-blue-300 leading-none mt-0.5">{collaborator.badge_number}</p>
            </div>
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-xs">{collaborator.name.charAt(0)}</span>
            </div>
            <ThemeToggle className="text-blue-200 hover:bg-blue-700 hover:text-white" />
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-blue-200" />
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around py-2 sticky bottom-0">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 text-xs py-1 px-3">
          <LayoutDashboard className="w-5 h-5" />
          Início
        </Link>
        <Link href="/checkout" className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 text-xs py-1 px-3">
          <PlusCircle className="w-5 h-5" />
          Retirar
        </Link>
        <Link href="/schedules" className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 text-xs py-1 px-3">
          <Calendar className="w-5 h-5" />
          Agenda
        </Link>
        <Link href="/checkin" className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 text-xs py-1 px-3">
          <Car className="w-5 h-5" />
          Devolver
        </Link>
      </nav>
    </div>
  )
}
