'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../components/AuthGuard'

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
  first_seen: string | null
  updated_at: string | null
  notes: Array<{ text: string; source?: string | null }> | null
}

type CoverageArticle = {
  id: string
  title: string
  url: string
  outlet: string
  excerpt: string
  sentiment: string | null
  published_at: string
  discovered_at: string
  topic_name: string | null
}

type Interaction = {
  id: string
  journalist_id: string
  user_id: string
  type: string
  subject: string
  body: string | null
  outcome: string | null
  related_mention_id: string | null
  created_at: string
}

function sentimentDot(val: string | null) {
  if (val === 'positive') return 'bg-emerald-500'
  if (val === 'negative') return 'bg-red-500'
  return 'bg-gray-300'
}

function sentimentLabel(val: number | null): { text: string; color: string } {
  if (val === null) return { text: 'Unknown', color: 'text-gray-400' }
  if (val > 0.3) return { text: 'Positive', color: 'text-emerald-600' }
  if (val < -0.3) return { text: 'Negative', color: 'text-red-600' }
  return { text: 'Neutral', color: 'text-gray-500' }
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function interactionIcon(type: string) {
  switch (type) {
    case 'pitch':
      return 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75'
    case 'email':
      return 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75'
    case 'call':
      return 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z'
    case 'meeting':
      return 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
    case 'note':
      return 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z'
    case 'response':
      return 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3'
    default:
      return 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'
  }
}

function outcomeBadge(outcome: string | null) {
  switch (outcome) {
    case 'positive':
      return { text: 'Positive', className: 'bg-emerald-50 text-emerald-700' }
    case 'negative':
      return { text: 'Negative', className: 'bg-red-50 text-red-700' }
    case 'pending':
      return { text: 'Pending', className: 'bg-amber-50 text-amber-700' }
    case 'no_response':
      return { text: 'No Response', className: 'bg-gray-100 text-gray-600' }
    default:
      return null
  }
}

function calculateRelationshipScore(
  interactions: Interaction[],
  articles: CoverageArticle[],
  lastArticleDate: string | null
): { score: number; label: string; color: string } {
  let score = 0

  // Points for interactions (weighted by type)
  for (const i of interactions) {
    if (i.type === 'meeting') score += 5
    else if (i.type === 'call') score += 4
    else if (i.type === 'response') score += 3
    else if (i.type === 'pitch' || i.type === 'email') score += 2
    else score += 1
  }

  // Points for coverage
  score += articles.length * 2

  // Recency bonus
  if (lastArticleDate) {
    const days = Math.floor((Date.now() - new Date(lastArticleDate).getTime()) / (1000 * 60 * 60 * 24))
    if (days < 7) score += 10
    else if (days < 30) score += 5
    else if (days < 90) score += 2
  }

  if (score >= 20) return { score, label: 'Strong', color: 'bg-emerald-100 text-emerald-800' }
  if (score >= 10) return { score, label: 'Active', color: 'bg-blue-100 text-blue-800' }
  if (score >= 3) return { score, label: 'Developing', color: 'bg-amber-100 text-amber-800' }
  return { score, label: 'New', color: 'bg-gray-100 text-gray-600' }
}

export default function JournalistProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [journalist, setJournalist] = useState<Journalist | null>(null)
  const [coverage, setCoverage] = useState<CoverageArticle[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showInteractionForm, setShowInteractionForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Interaction form state
  const [intType, setIntType] = useState<string>('note')
  const [intSubject, setIntSubject] = useState('')
  const [intBody, setIntBody] = useState('')
  const [intOutcome, setIntOutcome] = useState<string>('')

  // Edit form state
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editTwitter, setEditTwitter] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editBeat, setEditBeat] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const userParam = user?.id ? `?user_id=${user.id}` : ''
      const [jRes, cRes, iRes] = await Promise.all([
        fetch(`/api/journalists/${id}`),
        fetch(`/api/journalists/${id}/coverage${userParam}`),
        fetch(`/api/journalists/${id}/interactions`),
      ])

      if (jRes.ok) {
        const j = await jRes.json()
        setJournalist(j)
        setEditEmail(j.email || '')
        setEditPhone(j.phone || '')
        setEditTwitter(j.twitter || '')
        setEditLinkedin(j.linkedin || '')
        setEditWebsite(j.website || '')
        setEditBeat((j.beat || []).join(', '))
      }
      if (cRes.ok) setCoverage(await cRes.json())
      if (iRes.ok) setInteractions(await iRes.json())
    } catch (err) {
      console.error('Failed to load journalist profile:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intSubject.trim() || !user) return

    setSaving(true)
    try {
      const res = await fetch(`/api/journalists/${id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: intType,
          subject: intSubject.trim(),
          body: intBody.trim() || null,
          outcome: intOutcome || null,
          user_id: user.id,
        }),
      })

      if (res.ok) {
        setIntType('note')
        setIntSubject('')
        setIntBody('')
        setIntOutcome('')
        setShowInteractionForm(false)
        const iRes = await fetch(`/api/journalists/${id}/interactions`)
        if (iRes.ok) setInteractions(await iRes.json())
      }
    } catch (err) {
      console.error('Failed to add interaction:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/journalists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          twitter: editTwitter.trim() || null,
          linkedin: editLinkedin.trim() || null,
          website: editWebsite.trim() || null,
          beat: editBeat.split(',').map(b => b.trim()).filter(Boolean),
        }),
      })

      if (res.ok) {
        setShowEditForm(false)
        fetchAll()
      }
    } catch (err) {
      console.error('Failed to update journalist:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted">Loading journalist profile...</p>
      </div>
    )
  }

  if (!journalist) {
    return (
      <div className="glass-card p-12 text-center">
        <h2 className="font-semibold mb-2">Journalist not found</h2>
        <p className="text-sm text-muted mb-4">This journalist may have been removed.</p>
        <Link href="/dashboard/journalists" className="text-accent hover:underline text-sm">
          Back to Journalists
        </Link>
      </div>
    )
  }

  const sentiment = sentimentLabel(journalist.avg_sentiment)
  const relationship = calculateRelationshipScore(interactions, coverage, journalist.last_article_date)

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push('/dashboard/journalists')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-near-black transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Journalists
      </button>

      {/* Header */}
      <div className="glass-card p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
              <span className="text-lg font-semibold text-muted">
                {journalist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">{journalist.name}</h1>
              {journalist.outlet && (
                <p className="text-sm text-muted">{journalist.outlet}</p>
              )}
              {journalist.beat && journalist.beat.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {journalist.beat.map((b, i) => (
                    <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cream-200 text-muted">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${relationship.color}`}>
              {relationship.label} ({relationship.score} pts)
            </span>
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="text-xs text-muted hover:text-accent transition px-2 py-1 rounded hover:bg-accent/5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contact row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <div>
            <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Email</div>
            {journalist.email ? (
              <a href={`mailto:${journalist.email}`} className="text-sm text-accent hover:underline break-all">{journalist.email}</a>
            ) : (
              <span className="text-sm text-light-muted">Not found</span>
            )}
          </div>
          <div>
            <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Phone</div>
            {journalist.phone ? (
              <a href={`tel:${journalist.phone}`} className="text-sm text-accent hover:underline">{journalist.phone}</a>
            ) : (
              <span className="text-sm text-light-muted">Not found</span>
            )}
          </div>
          <div>
            <div className="text-xs text-light-muted uppercase tracking-wide mb-1">X / Twitter</div>
            {journalist.twitter ? (
              <a href={`https://x.com/${journalist.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">{journalist.twitter}</a>
            ) : (
              <span className="text-sm text-light-muted">Not found</span>
            )}
          </div>
          <div>
            <div className="text-xs text-light-muted uppercase tracking-wide mb-1">LinkedIn</div>
            {journalist.linkedin ? (
              <a href={journalist.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">Profile</a>
            ) : (
              <span className="text-sm text-light-muted">Not found</span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-semibold">{journalist.article_count}</div>
            <div className="text-xs text-muted mt-0.5">Articles</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-semibold ${sentiment.color}`}>
              {journalist.avg_sentiment !== null ? journalist.avg_sentiment.toFixed(2) : 'N/A'}
            </div>
            <div className="text-xs text-muted mt-0.5">Avg Sentiment</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold">{timeAgo(journalist.last_article_date)}</div>
            <div className="text-xs text-muted mt-0.5">Last Article</div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {showEditForm && (
        <form onSubmit={handleEditSave} className="glass-card p-6 sm:p-8 mb-6">
          <h2 className="font-semibold text-lg mb-6">Edit Contact Info</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="reporter@outlet.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">X / Twitter</label>
              <input
                type="text"
                value={editTwitter}
                onChange={(e) => setEditTwitter(e.target.value)}
                placeholder="@handle"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">LinkedIn</label>
              <input
                type="url"
                value={editLinkedin}
                onChange={(e) => setEditLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Website</label>
              <input
                type="url"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Beats (comma-separated)</label>
              <input
                type="text"
                value={editBeat}
                onChange={(e) => setEditBeat(e.target.value)}
                placeholder="e.g. politics, energy"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-near-black text-cream-50 px-5 py-2 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="text-sm text-muted hover:text-near-black transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Intel section */}
      {journalist.notes && Array.isArray(journalist.notes) && journalist.notes.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[family-name:var(--font-serif)] text-lg">Intel</h2>
            <span className="text-[10px] text-light-muted uppercase tracking-wide">{journalist.notes.length} notes</span>
          </div>
          <div className="space-y-3">
            {journalist.notes.map((note: { text: string; source?: string | null }, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/40 mt-2 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{note.text}</p>
                  {note.source && (
                    <a
                      href={note.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-accent hover:underline"
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Coverage section */}
        <div>
          <h2 className="font-[family-name:var(--font-serif)] text-xl mb-4">Coverage</h2>
          {coverage.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted">No articles tracked yet.</p>
              <p className="text-xs text-light-muted mt-1">Articles will appear here as the monitor finds their bylines.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coverage.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card p-4 block hover:bg-cream-100/50 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sentimentDot(article.sentiment)}`} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium leading-snug line-clamp-2">{article.title || 'Untitled'}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted">
                        {article.topic_name && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cream-200">
                            {article.topic_name}
                          </span>
                        )}
                        <span>{formatDate(article.published_at)}</span>
                      </div>
                      {article.excerpt && (
                        <p className="text-xs text-light-muted mt-2 line-clamp-2">{article.excerpt}</p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Interactions section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[family-name:var(--font-serif)] text-xl">Interactions</h2>
            <button
              onClick={() => setShowInteractionForm(!showInteractionForm)}
              className="bg-near-black text-cream-50 px-4 py-1.5 rounded-full text-xs font-medium hover:bg-near-black/85 transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Log Interaction
            </button>
          </div>

          {/* Interaction form */}
          {showInteractionForm && (
            <form onSubmit={handleAddInteraction} className="glass-card p-5 mb-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Type</label>
                    <select
                      value={intType}
                      onChange={(e) => setIntType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-near-black text-sm focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                    >
                      <option value="pitch">Pitch</option>
                      <option value="email">Email</option>
                      <option value="call">Call</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Note</option>
                      <option value="response">Response</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Outcome</label>
                    <select
                      value={intOutcome}
                      onChange={(e) => setIntOutcome(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white text-near-black text-sm focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                    >
                      <option value="">None</option>
                      <option value="pending">Pending</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="no_response">No Response</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    value={intSubject}
                    onChange={(e) => setIntSubject(e.target.value)}
                    placeholder="Brief description of the interaction"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted text-sm focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={intBody}
                    onChange={(e) => setIntBody(e.target.value)}
                    placeholder="Details, key takeaways, follow-up items..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted text-sm focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition resize-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving || !intSubject.trim()}
                    className="bg-near-black text-cream-50 px-4 py-2 rounded-full text-xs font-medium hover:bg-near-black/85 transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInteractionForm(false)}
                    className="text-xs text-muted hover:text-near-black transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Interaction timeline */}
          {interactions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted">No interactions logged yet.</p>
              <p className="text-xs text-light-muted mt-1">Log a pitch, call, or note to start tracking outreach.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {interactions.map((interaction, idx) => {
                const badge = outcomeBadge(interaction.outcome)
                return (
                  <div key={interaction.id} className="relative pl-8">
                    {/* Timeline line */}
                    {idx < interactions.length - 1 && (
                      <div className="absolute left-[13px] top-8 bottom-0 w-px bg-border" />
                    )}
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1.5 w-[27px] h-[27px] rounded-full bg-cream-200 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={interactionIcon(interaction.type)} />
                      </svg>
                    </div>
                    <div className="glass-card p-4 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cream-200 text-muted capitalize">
                          {interaction.type}
                        </span>
                        {badge && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.className}`}>
                            {badge.text}
                          </span>
                        )}
                        <span className="text-xs text-light-muted ml-auto">{formatDate(interaction.created_at)}</span>
                      </div>
                      <h4 className="text-sm font-medium">{interaction.subject}</h4>
                      {interaction.body && (
                        <p className="text-xs text-muted mt-1.5 leading-relaxed">{interaction.body}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
