'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Car, LayoutDashboard, PlusCircle, LogOut, Calendar, Navigation, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/checkout', label: 'Retirar', icon: PlusCircle },
  { href: '/schedules', label: 'Agenda', icon: Calendar },
  { href: '/ronda', label: 'Ronda', icon: Navigation },
  { href: '/checkin', label: 'Devolver', icon: Car },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { collaborator, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

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
        <span className="font-bold text-base tracking-tight">S.I.R.U</span>

        <nav className="hidden md:flex items-center gap-1 ml-6">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-blue-700 dark:bg-blue-800 text-white'
                  : 'text-blue-200 hover:bg-blue-700/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {collaborator && (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-white leading-none">{collaborator.name}</p>
                <p className="text-xs text-blue-300 leading-none mt-0.5">{collaborator.badge_number}</p>
              </div>
              <Link
                href="/conta"
                className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0 hover:bg-blue-500 transition-colors"
                title="Alterar senha"
              >
                <span className="text-white font-semibold text-xs">{collaborator.name.charAt(0)}</span>
              </Link>
              <Link
                href="/conta"
                className="p-1.5 rounded-lg hover:bg-blue-700 transition-colors sm:hidden"
                title="Alterar senha"
              >
                <KeyRound className="w-4 h-4 text-blue-200" />
              </Link>
            </>
          )}
          <ThemeToggle className="text-blue-200 hover:bg-blue-700 hover:text-white" />
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4 text-blue-200" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className={`flex-1 p-4 md:p-6 mx-auto w-full ${pathname === '/dashboard' ? 'max-w-6xl' : 'max-w-2xl'}`}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around py-2 sticky bottom-0 md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 text-xs py-1 px-3 ${
              pathname === href
                ? 'text-blue-700 dark:text-blue-400 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
