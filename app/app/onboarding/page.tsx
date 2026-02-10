'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC','US'
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Topic form state
  const [name, setName] = useState('')
  const [type, setType] = useState<'bill' | 'topic'>('topic')
  const [state, setState] = useState('')
  const [keywords, setKeywords] = useState('')
  const [billIds, setBillIds] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUserId(session.user.id)
      setLoading(false)
    })
  }, [router])

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !userId) return

    setSaving(true)
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          state: state || null,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          bill_ids: billIds.split(',').map(b => b.trim()).filter(Boolean),
          user_id: userId,
        }),
      })

      if (res.ok) {
        setStep(3)
      }
    } catch (err) {
      console.error('Failed to create topic:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-12">
          <Link href="/" className="font-[family-name:var(--font-serif)] text-3xl tracking-tight inline-block">
            PolicyFront
          </Link>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                step >= s
                  ? 'bg-near-black text-cream-50'
                  : 'bg-cream-200 text-light-muted'
              }`}>
                {step > s ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-near-black' : 'bg-cream-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-serif)] text-[clamp(1.75rem,3vw,2.5rem)] leading-tight mb-4">
              Welcome to PolicyFront
            </h1>
            <p className="text-muted text-lg leading-relaxed mb-10 max-w-md mx-auto">
              Let&apos;s set up your first topic to monitor. You can track specific bills or broad policy areas.
            </p>
            <button
              onClick={() => setStep(2)}
              className="bg-near-black text-cream-50 px-8 py-3.5 rounded-full text-base font-medium hover:bg-near-black/85 transition inline-flex items-center gap-2 group"
            >
              Get Started
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Step 2: Create first topic */}
        {step === 2 && (
          <div>
            <h2 className="font-[family-name:var(--font-serif)] text-2xl mb-2 text-center">
              Create your first topic
            </h2>
            <p className="text-muted text-center mb-8">
              What legislation or policy area do you want to monitor?
            </p>

            <form onSubmit={handleCreateTopic} className="glass-card p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Topic Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. California Solar Policy"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'bill' | 'topic')}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                  >
                    <option value="topic">Policy Topic</option>
                    <option value="bill">Specific Bill</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                  >
                    <option value="">All / Federal</option>
                    {US_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. solar checkoff, renewable energy fee"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                />
              </div>

              {type === 'bill' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Bill IDs (comma-separated)</label>
                  <input
                    type="text"
                    value={billIds}
                    onChange={(e) => setBillIds(e.target.value)}
                    placeholder="e.g. AB-1290, HB-123"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="bg-near-black text-cream-50 px-6 py-3 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? (
                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Create Topic'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-muted hover:text-near-black transition"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-[family-name:var(--font-serif)] text-2xl mb-3">
              You&apos;re all set
            </h2>
            <p className="text-muted leading-relaxed mb-10 max-w-sm mx-auto">
              Your topic is being monitored. We&apos;ll scan for media coverage every 4 hours and send you a daily digest at noon.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-near-black text-cream-50 px-8 py-3.5 rounded-full text-base font-medium hover:bg-near-black/85 transition"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => { setName(''); setKeywords(''); setBillIds(''); setStep(2) }}
                className="text-sm text-muted hover:text-near-black transition"
              >
                Add another topic
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
