'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Collaborator } from '@/types'

interface AuthContextType {
  user: User | null
  collaborator: Collaborator | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  collaborator: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadCollaborator(userId: string) {
    const { data } = await supabase
      .from('collaborators')
      .select('*, branch:branches(name, city)')
      .eq('user_id', userId)
      .maybeSingle()
    setCollaborator(data)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadCollaborator(user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadCollaborator(u.id)
      else { setCollaborator(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user !== undefined) setLoading(false)
  }, [user, collaborator])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, collaborator, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
