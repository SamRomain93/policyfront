'use client'

import { useState } from 'react'
import Link from 'next/link'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'dark' | 'inline' }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setState('success')
        setEmail('')
      } else {
        const data = await res.json()
        if (data.error === 'already_joined') {
          setState('success')
          setEmail('')
        } else {
          setState('error')
          setErrorMsg('Something went wrong. Try again.')
        }
      }
    } catch {
      setState('error')
      setErrorMsg('Something went wrong. Try again.')
    }
  }

  if (state === 'success') {
    return (
      <div className={`flex items-center gap-2 text-base font-medium ${variant === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        You&apos;re on the list. We&apos;ll be in touch.
      </div>
    )
  }

  const isDark = variant === 'dark'
  const isInline = variant === 'inline'

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <form onSubmit={handleSubmit} className={`flex ${isInline ? 'flex-row' : 'flex-col sm:flex-row'} gap-3 ${isInline ? 'max-w-md' : 'max-w-lg'} w-full`}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setState('idle'); setEmail(e.target.value) }}
          placeholder="Enter your work email"
          required
          className={`flex-1 px-5 py-3.5 rounded-full text-base outline-none transition ${
            isDark
              ? 'bg-white/10 border border-white/20 text-cream-50 placeholder:text-cream-200/50 focus:border-white/40'
              : 'bg-white border border-border text-near-black placeholder:text-light-muted focus:border-accent/40 focus:ring-2 focus:ring-accent/10'
          } ${state === 'error' ? (isDark ? 'border-red-400' : 'border-red-500') : ''}`}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className={`px-7 py-3.5 rounded-full text-base font-medium transition whitespace-nowrap flex items-center justify-center gap-2 ${
            isDark
              ? 'bg-cream-50 text-near-black hover:bg-white disabled:opacity-60'
              : 'bg-near-black text-cream-50 hover:bg-near-black/85 disabled:opacity-60'
          }`}
        >
          {state === 'loading' ? (
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Join Waitlist
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
        {state === 'error' && errorMsg && (
          <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>{errorMsg}</p>
        )}
      </form>
      <p className={`text-sm ${isDark ? 'text-cream-200/70' : 'text-muted'}`}>
        Have a referral code?{' '}
        <Link 
          href="/signup-referral" 
          className={`font-medium ${isDark ? 'text-cream-50 hover:text-white' : 'text-near-black hover:underline'} transition`}
        >
          Sign up here
        </Link>
      </p>
    </div>
  )
}
