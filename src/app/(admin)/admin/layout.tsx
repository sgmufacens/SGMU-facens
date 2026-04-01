'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Car, Users, Building2, History, ArrowLeft, Settings, LogOut, Calendar, LayoutDashboard } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  { href: '/admin',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/vehicles',      label: 'Veículos',       icon: Car },
  { href: '/admin/collaborators', label: 'Colaboradores',  icon: Users },
  { href: '/admin/branches',      label: 'Filiais',        icon: Building2 },
  { href: '/admin/history',       label: 'Histórico',      icon: History },
  { href: '/admin/schedules',     label: 'Agendamentos',   icon: Calendar },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Don't render admin layout on login page
  if (pathname === '/admin/login') return <>{children}</>

  async function logout() {
    await fetch('/api/admin', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <Link href="/dashboard" className="p-1.5 rounded hover:bg-slate-700 transition-colors" title="Voltar ao app">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Settings className="w-5 h-5 text-slate-400" />
        <span className="font-bold text-lg">Administração</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="text-slate-400 hover:bg-slate-700 hover:text-white" />
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 flex gap-1 overflow-x-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'border-blue-700 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </div>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
