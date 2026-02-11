'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '../components/AuthGuard'

type Journalist = {
  id: string
  name: string
  outlet: string | null
  email: string | null
  phone: string | null
  twitter: string | null
  linkedin: string | null
  website: string | null
  beat: string[] | null
  article_count: number
  avg_sentiment: number | null
  last_article_date: string | null
}

function sentimentDot(val: number | null) {
  if (val === null) return 'bg-gray-300'
  if (val > 0.3) return 'bg-emerald-500'
  if (val < -0.3) return 'bg-red-500'
  return 'bg-gray-300'
}

function sentimentLabel(val: number | null): string {
  if (val === null) return 'Unknown'
  if (val > 0.3) return 'Positive'
  if (val < -0.3) return 'Negative'
  return 'Neutral'
}

function timeAgo(date: string | null) {
  if (!date) return 'N/A'
  const now = new Date()
  const then = new Date(date)
  const days = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function relationshipScore(j: Journalist): number {
  let score = 0
  score += (j.article_count || 0) * 2
  if (j.last_article_date) {
    const days = Math.floor((Date.now() - new Date(j.last_article_date).getTime()) / (1000 * 60 * 60 * 24))
    if (days < 7) score += 10
    else if (days < 30) score += 5
    else if (days < 90) score += 2
  }
  if (j.email) score += 2
  if (j.twitter) score += 1
  if (j.phone) score += 2
  return score
}

function relationshipBadge(score: number): { label: string; color: string } {
  if (score >= 20) return { label: 'Strong', color: 'bg-emerald-100 text-emerald-800' }
  if (score >= 10) return { label: 'Active', color: 'bg-blue-100 text-blue-800' }
  if (score >= 3) return { label: 'Developing', color: 'bg-amber-100 text-amber-800' }
  return { label: 'New', color: 'bg-gray-100 text-gray-600' }
}

export default function JournalistsPage() {
  const { user } = useAuth()
  const [journalists, setJournalists] = useState<Journalist[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('article_count')
  const [search, setSearch] = useState('')
  const [beatFilter, setBeatFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add form state
  const [addName, setAddName] = useState('')
  const [addOutlet, setAddOutlet] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addTwitter, setAddTwitter] = useState('')
  const [addLinkedin, setAddLinkedin] = useState('')
  const [addBeat, setAddBeat] = useState('')

  const fetchJournalists = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, limit: '200' })
      if (user?.id) params.set('user_id', user.id)
      if (search.trim()) params.set('search', search.trim())
      if (beatFilter) params.set('beat', beatFilter)
      const res = await fetch(`/api/journalists?${params}`)
      if (res.ok) {
        const data = await res.json()
        setJournalists(data)
      }
    } catch (err) {
      console.error('Failed to fetch journalists:', err)
    } finally {
      setLoading(false)
    }
  }, [sort, search, beatFilter, user])

  useEffect(() => {
    const timer = setTimeout(() => fetchJournalists(), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchJournalists, search])

  // Get unique beats for filter
  const allBeats = useMemo(() => {
    const beats = new Set<string>()
    journalists.forEach(j => j.beat?.forEach(b => beats.add(b)))
    return Array.from(beats).sort()
  }, [journalists])

  // Get unique outlets for stats
  const outlets = useMemo(
    () => [...new Set(journalists.map(j => j.outlet).filter(Boolean))],
    [journalists]
  )

  // Client-side sort for relationship score
  const sortedJournalists = useMemo(() => {
    if (sort === 'relationship') {
      return [...journalists].sort((a, b) => relationshipScore(b) - relationshipScore(a))
    }
    return journalists
  }, [journalists, sort])

  const handleAddJournalist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/journalists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          outlet: addOutlet.trim() || null,
          email: addEmail.trim() || null,
          phone: addPhone.trim() || null,
          twitter: addTwitter.trim() || null,
          linkedin: addLinkedin.trim() || null,
          beat: addBeat.split(',').map(b => b.trim()).filter(Boolean),
          manual: true,
        }),
      })

      if (res.ok) {
        setAddName('')
        setAddOutlet('')
        setAddEmail('')
        setAddPhone('')
        setAddTwitter('')
        setAddLinkedin('')
        setAddBeat('')
        setShowAddForm(false)
        fetchJournalists()
      }
    } catch (err) {
      console.error('Failed to add journalist:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Journalists</h1>
          <p className="text-sm text-muted">Reporters covering your policy areas. Track outreach and coverage.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Journalist
        </button>
      </div>

      {/* Add journalist form */}
      {showAddForm && (
        <form onSubmit={handleAddJournalist} className="glass-card p-8 mb-6">
          <h2 className="font-semibold text-lg mb-6">Add Journalist</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name *</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Outlet</label>
              <input
                type="text"
                value={addOutlet}
                onChange={(e) => setAddOutlet(e.target.value)}
                placeholder="e.g. Washington Post"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="reporter@outlet.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input
                type="text"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">X / Twitter</label>
              <input
                type="text"
                value={addTwitter}
                onChange={(e) => setAddTwitter(e.target.value)}
                placeholder="@handle"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">LinkedIn</label>
              <input
                type="url"
                value={addLinkedin}
                onChange={(e) => setAddLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Beats (comma-separated)</label>
              <input
                type="text"
                value={addBeat}
                onChange={(e) => setAddBeat(e.target.value)}
                placeholder="e.g. energy, climate, politics"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              disabled={saving || !addName.trim()}
              className="bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Journalist'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-sm text-muted hover:text-near-black transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold">{journalists.length}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Journalists</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold">{outlets.length}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Outlets</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold">
            {journalists.filter(j => j.email || j.twitter || j.phone).length}
          </div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">With Contact</div>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or outlet..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
          />
        </div>
        {allBeats.length > 0 && (
          <select
            value={beatFilter}
            onChange={(e) => setBeatFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-border bg-white text-near-black text-sm focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
          >
            <option value="">All Beats</option>
            {allBeats.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
          {[
            { label: 'Articles', value: 'article_count' },
            { label: 'Recent', value: 'recent' },
            { label: 'Relationship', value: 'relationship' },
            { label: 'Sentiment', value: 'sentiment' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                sort === s.value ? 'bg-near-black text-cream-50' : 'text-muted hover:text-near-black'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Journalist list */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading journalists...</p>
        </div>
      ) : sortedJournalists.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 className="font-medium mb-2">
            {search || beatFilter ? 'No journalists match your filters' : 'No journalists yet'}
          </h3>
          <p className="text-sm text-muted">
            {search || beatFilter
              ? 'Try adjusting your search or filters.'
              : 'Journalist profiles are auto-extracted from article bylines during monitoring.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedJournalists.map(j => {
            const relScore = relationshipScore(j)
            const rel = relationshipBadge(relScore)
            const hasContact = j.email || j.twitter || j.phone || j.linkedin
            return (
              <Link
                key={j.id}
                href={`/dashboard/journalists/${j.id}`}
                className="glass-card p-5 block hover:bg-cream-100/50 transition group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-muted">
                        {j.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate group-hover:text-accent transition">{j.name}</span>
                        {hasContact && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Contact info available" />
                        )}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${rel.color} hidden sm:inline`}>
                          {rel.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        {j.outlet && <span>{j.outlet}</span>}
                        {j.beat && j.beat.length > 0 && (
                          <>
                            <span className="text-light-muted">·</span>
                            <span className="truncate">{j.beat.slice(0, 3).join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className={`w-2 h-2 rounded-full ${sentimentDot(j.avg_sentiment)}`} />
                        <span className="text-sm font-medium">{j.article_count} articles</span>
                      </div>
                      <div className="text-xs text-light-muted">{sentimentLabel(j.avg_sentiment)}</div>
                    </div>
                    <div className="text-xs text-light-muted hidden sm:block">
                      {timeAgo(j.last_article_date)}
                    </div>
                    <svg
                      className="w-4 h-4 text-light-muted group-hover:text-accent transition"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
