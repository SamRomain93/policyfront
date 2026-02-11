'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase-browser'
import type { User, Session } from '@supabase/supabase-js'
import TrialExpiredModal from './TrialExpiredModal'

type ExtendedUser = User & {
  name?: string
  trial_ends_at?: string
  subscription_status?: string
}

type AuthContextType = {
  user: ExtendedUser | null
  session: Session | null
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null })

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) {
        router.replace('/login')
        return
      }

      // Fetch user data from database
      const { data: userData } = await supabase
        .from('users')
        .select('name, trial_ends_at, subscription_status')
        .eq('id', s.user.id)
        .single()

      const extendedUser = {
        ...s.user,
        ...userData
      }

      setUser(extendedUser)
      setSession(s)

      // Check if trial expired
      if (userData?.trial_ends_at && userData?.subscription_status === 'trial') {
        const trialEnd = new Date(userData.trial_ends_at)
        const now = new Date()
        if (trialEnd < now) {
          setShowTrialModal(true)
        }
      }

      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!s) {
        router.replace('/login')
        return
      }

      // Fetch user data from database
      const { data: userData } = await supabase
        .from('users')
        .select('name, trial_ends_at, subscription_status')
        .eq('id', s.user.id)
        .single()

      const extendedUser = {
        ...s.user,
        ...userData
      }

      setUser(extendedUser)
      setSession(s)

      // Check if trial expired
      if (userData?.trial_ends_at && userData?.subscription_status === 'trial') {
        const trialEnd = new Date(userData.trial_ends_at)
        const now = new Date()
        if (trialEnd < now) {
          setShowTrialModal(true)
        }
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <AuthContext.Provider value={{ user, session }}>
      {children}
      {showTrialModal && <TrialExpiredModal userName={user.name} />}
    </AuthContext.Provider>
  )
}
