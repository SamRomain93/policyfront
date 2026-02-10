'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 5 * 60 * 1000 // 5 min lockout

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const router = useRouter()

  // Honeypot field - bots fill this, humans don't see it
  const honeypotRef = useRef<HTMLInputElement>(null)

  // Track form render time - bots submit instantly
  const renderTime = useRef(0)
  useEffect(() => { renderTime.current = Date.now() }, [])

  useEffect(() => {
    // Check if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Honeypot check - if filled, silently reject
    if (honeypotRef.current && honeypotRef.current.value) {
      // Fake success to waste bot time
      setLoading(true)
      await new Promise(r => setTimeout(r, 2000))
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    // Timing check - reject if submitted in under 1.5 seconds
    if (Date.now() - renderTime.current < 1500) {
      setError('Invalid email or password')
      return
    }

    // Lockout check
    if (lockedUntil > Date.now()) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      setError(`Too many attempts. Try again in ${remaining}s`)
      return
    }

    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS)
        setError('Too many failed attempts. Locked for 5 minutes.')
      } else {
        setError('Invalid email or password')
      }

      setLoading(false)
      return
    }

    // Check if user has any topics, if not redirect to onboarding
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      try {
        const topicsRes = await fetch(`/api/topics?user_id=${session.user.id}`)
        const topics = await topicsRes.json()
        if (Array.isArray(topics) && topics.length === 0) {
          router.push('/onboarding')
          return
        }
      } catch {
        // If check fails, just go to dashboard
      }
    }
    router.push('/dashboard')
  }

  const checkLocked = useCallback(() => lockedUntil > Date.now(), [lockedUntil])
  const isLocked = checkLocked()

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="font-[family-name:var(--font-serif)] text-3xl tracking-tight mb-2 inline-block">
            PolicyFront
          </Link>
          <p className="text-sm text-muted">Sign in to your account</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Password</label>
              <Link href="/reset-password" className="text-xs text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
              placeholder="••••••••"
            />
          </div>

          {/* Honeypot - invisible to humans, bots fill it */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <label htmlFor="website">Website</label>
            <input
              ref={honeypotRef}
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full bg-near-black text-cream-50 py-3 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-light-muted mt-8">
          PolicyFront v0.1
        </p>
      </div>
    </div>
  )
}
