'use client'

import { useState, useEffect, useCallback } from 'react'

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

export default function JournalistsPage() {
  const [journalists, setJournalists] = useState<Journalist[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('article_count')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchJournalists = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/journalists?sort=${sort}`)
      if (res.ok) {
        const data = await res.json()
        setJournalists(data)
      }
    } catch (err) {
      console.error('Failed to fetch journalists:', err)
    } finally {
      setLoading(false)
    }
  }, [sort])

  useEffect(() => {
    fetchJournalists()
  }, [fetchJournalists])

  // Get unique outlets for stats
  const outlets = [...new Set(journalists.map(j => j.outlet).filter(Boolean))]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Journalists</h1>
          <p className="text-sm text-muted">Reporters covering your policy areas, auto-extracted from mentions.</p>
        </div>
      </div>

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

      {/* Sort */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-muted">Sort by:</span>
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
          {[
            { label: 'Most Articles', value: 'article_count' },
            { label: 'Recent', value: 'recent' },
            { label: 'Sentiment', value: 'sentiment' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                sort === s.value ? 'bg-near-black text-cream-50' : 'text-muted hover:text-near-black'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading journalists...</p>
        </div>
      ) : journalists.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 className="font-medium mb-2">No journalists yet</h3>
          <p className="text-sm text-muted">Journalist profiles are auto-extracted from article bylines during monitoring.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {journalists.map(j => {
            const sentiment = sentimentLabel(j.avg_sentiment)
            const hasContact = j.email || j.twitter || j.phone || j.linkedin
            return (
              <div key={j.id} className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
                  className="w-full p-5 text-left hover:bg-cream-100/50 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar placeholder */}
                      <div className="w-10 h-10 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-muted">
                          {j.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{j.name}</span>
                          {hasContact && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Contact info available" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted">
                          {j.outlet && <span>{j.outlet}</span>}
                          {j.beat && j.beat.length > 0 && (
                            <>
                              <span className="text-light-muted">·</span>
                              <span>{j.beat.slice(0, 2).join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium">{j.article_count} articles</div>
                        <div className={`text-xs ${sentiment.color}`}>{sentiment.text}</div>
                      </div>
                      <div className="text-xs text-light-muted hidden sm:block">
                        {timeAgo(j.last_article_date)}
                      </div>
                      <svg
                        className={`w-4 h-4 text-muted transition-transform ${expandedId === j.id ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {expandedId === j.id && (
                  <div className="border-t border-border px-5 py-5 space-y-4">
                    {/* Contact info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Email</div>
                        {j.email ? (
                          <a href={`mailto:${j.email}`} className="text-sm text-accent hover:underline break-all">{j.email}</a>
                        ) : (
                          <span className="text-sm text-light-muted">Not found</span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Phone</div>
                        {j.phone ? (
                          <a href={`tel:${j.phone}`} className="text-sm text-accent hover:underline">{j.phone}</a>
                        ) : (
                          <span className="text-sm text-light-muted">Not found</span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-1">X / Twitter</div>
                        {j.twitter ? (
                          <a href={`https://x.com/${j.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">{j.twitter}</a>
                        ) : (
                          <span className="text-sm text-light-muted">Not found</span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-1">LinkedIn</div>
                        {j.linkedin ? (
                          <a href={j.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">Profile</a>
                        ) : (
                          <span className="text-sm text-light-muted">Not found</span>
                        )}
                      </div>
                    </div>

                    {/* Beats */}
                    {j.beat && j.beat.length > 0 && (
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-2">Beats</div>
                        <div className="flex flex-wrap gap-2">
                          {j.beat.map((b, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full bg-cream-100 text-xs font-medium">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Articles</div>
                        <div className="text-lg font-semibold">{j.article_count}</div>
                      </div>
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Avg Sentiment</div>
                        <div className={`text-lg font-semibold ${sentiment.color}`}>
                          {j.avg_sentiment !== null ? j.avg_sentiment.toFixed(2) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Last Article</div>
                        <div className="text-lg font-semibold">{timeAgo(j.last_article_date)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
