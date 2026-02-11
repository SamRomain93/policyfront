'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/AuthGuard'

type Topic = { id: string; name: string }

type Mention = {
  id: string
  url: string
  title: string
  outlet: string | null
  excerpt: string | null
  sentiment: string | null
  discovered_at: string
  published_at: string | null
  topic_id: string
  topic_name: string | null
  first_seen_for_story?: boolean
  story_cluster?: string | null
}

type StoryGroup = {
  key: string
  primary: Mention
  related: Mention[]
}

function timeAgo(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function sentimentDot(sentiment: string | null) {
  switch (sentiment) {
    case 'positive': return 'bg-emerald-500'
    case 'negative': return 'bg-red-500'
    case 'neutral': return 'bg-gray-300'
    default: return 'bg-gray-200'
  }
}

function sentimentBadge(sentiment: string | null) {
  switch (sentiment) {
    case 'positive': return { text: 'Positive', cls: 'bg-emerald-50 text-emerald-700' }
    case 'negative': return { text: 'Negative', cls: 'bg-red-50 text-red-700' }
    case 'neutral': return { text: 'Neutral', cls: 'bg-gray-50 text-gray-500' }
    default: return { text: 'Unscored', cls: 'bg-gray-50 text-gray-400' }
  }
}

const DATE_PRESETS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
]

function groupByStory(mentions: Mention[]): StoryGroup[] {
  const clusters: Record<string, Mention[]> = {}
  const ungrouped: Mention[] = []

  for (const m of mentions) {
    if (m.story_cluster) {
      if (!clusters[m.story_cluster]) clusters[m.story_cluster] = []
      clusters[m.story_cluster].push(m)
    } else {
      ungrouped.push(m)
    }
  }

  const groups: StoryGroup[] = []

  // Clustered stories: primary = first_seen or earliest
  for (const [key, items] of Object.entries(clusters)) {
    const sorted = items.sort((a, b) => new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime())
    const primary = sorted.find(m => m.first_seen_for_story) || sorted[0]
    const related = sorted.filter(m => m.id !== primary.id)
    groups.push({ key, primary, related })
  }

  // Ungrouped mentions as individual stories
  for (const m of ungrouped) {
    groups.push({ key: m.id, primary: m, related: [] })
  }

  // Sort: negative first, then by date
  groups.sort((a, b) => {
    const aScore = a.primary.sentiment === 'negative' ? 0 : a.primary.sentiment === 'positive' ? 2 : 1
    const bScore = b.primary.sentiment === 'negative' ? 0 : b.primary.sentiment === 'positive' ? 2 : 1
    if (aScore !== bScore) return aScore - bScore
    return new Date(b.primary.discovered_at).getTime() - new Date(a.primary.discovered_at).getTime()
  })

  return groups
}

export default function MentionsPage() {
  const { user } = useAuth()
  const [mentions, setMentions] = useState<Mention[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)

  const [topicFilter, setTopicFilter] = useState('all')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    if (!user) return
    fetch(`/api/topics?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTopics(data) })
      .catch(() => {})
  }, [user])

  const fetchMentions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ user_id: user.id })
      if (topicFilter !== 'all') params.set('topic_id', topicFilter)
      if (sentimentFilter !== 'all') params.set('sentiment', sentimentFilter)
      if (dateFilter === 'today') {
        const d = new Date(); d.setHours(0, 0, 0, 0); params.set('since', d.toISOString())
      } else if (dateFilter === 'week') {
        const d = new Date(); d.setDate(d.getDate() - 7); params.set('since', d.toISOString())
      } else if (dateFilter === 'month') {
        const d = new Date(); d.setMonth(d.getMonth() - 1); params.set('since', d.toISOString())
      }
      const res = await fetch(`/api/mentions?${params}`)
      if (res.ok) setMentions(await res.json())
    } catch (err) {
      console.error('Failed to fetch mentions:', err)
    } finally {
      setLoading(false)
    }
  }, [user, topicFilter, sentimentFilter, dateFilter])

  useEffect(() => { fetchMentions() }, [fetchMentions])

  const stories = groupByStory(mentions)
  const negCount = mentions.filter(m => m.sentiment === 'negative').length
  const posCount = mentions.filter(m => m.sentiment === 'positive').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Mentions</h1>
        <p className="text-sm text-muted">
          {mentions.length} articles across {stories.length} stories
          {negCount > 0 && <span className="text-red-600 ml-2">{negCount} negative</span>}
          {posCount > 0 && <span className="text-emerald-600 ml-2">{posCount} positive</span>}
        </p>
      </div>

      {/* Compact filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-near-black focus:outline-none focus:border-accent/40 transition"
        >
          <option value="all">All Topics</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div className="flex items-center gap-0.5 bg-white border border-border rounded-lg p-0.5">
          {['all', 'negative', 'positive', 'neutral'].map(s => (
            <button
              key={s}
              onClick={() => setSentimentFilter(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                sentimentFilter === s
                  ? s === 'negative' ? 'bg-red-50 text-red-700'
                    : s === 'positive' ? 'bg-emerald-50 text-emerald-700'
                    : s === 'neutral' ? 'bg-gray-100 text-gray-600'
                    : 'bg-near-black text-cream-50'
                  : 'text-muted hover:text-near-black'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 bg-white border border-border rounded-lg p-0.5">
          {DATE_PRESETS.map(d => (
            <button
              key={d.value}
              onClick={() => setDateFilter(d.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                dateFilter === d.value ? 'bg-near-black text-cream-50' : 'text-muted hover:text-near-black'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {(topicFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all') && (
          <button
            onClick={() => { setTopicFilter('all'); setSentimentFilter('all'); setDateFilter('all') }}
            className="text-[11px] text-accent hover:underline"
          >
            Clear
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              const params = new URLSearchParams()
              if (user?.id) params.set('user_id', user.id)
              if (topicFilter !== 'all') params.set('topic_id', topicFilter)
              if (sentimentFilter !== 'all') params.set('sentiment', sentimentFilter)
              if (dateFilter === 'today') {
                const d = new Date(); d.setHours(0, 0, 0, 0); params.set('since', d.toISOString())
              } else if (dateFilter === 'week') {
                const d = new Date(); d.setDate(d.getDate() - 7); params.set('since', d.toISOString())
              } else if (dateFilter === 'month') {
                const d = new Date(); d.setMonth(d.getMonth() - 1); params.set('since', d.toISOString())
              }
              window.open(`/api/mentions/export?${params}`, '_blank')
            }}
            className="text-xs font-medium text-muted hover:text-near-black border border-border rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams()
              if (user?.id) params.set('user_id', user.id)
              if (topicFilter !== 'all') {
                params.set('topic_id', topicFilter)
                const t = topics.find(t => t.id === topicFilter)
                if (t) params.set('topic_name', t.name)
              }
              if (sentimentFilter !== 'all') params.set('sentiment', sentimentFilter)
              if (dateFilter === 'today') {
                const d = new Date(); d.setHours(0, 0, 0, 0); params.set('since', d.toISOString())
              } else if (dateFilter === 'week') {
                const d = new Date(); d.setDate(d.getDate() - 7); params.set('since', d.toISOString())
              } else if (dateFilter === 'month') {
                const d = new Date(); d.setMonth(d.getMonth() - 1); params.set('since', d.toISOString())
              }
              window.open(`/api/mentions/report?${params}`, '_blank')
            }}
            className="text-xs font-medium text-muted hover:text-near-black border border-border rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Stories */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          </div>
          <p className="text-muted mb-1">
            {topicFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all'
              ? 'No mentions match your filters'
              : 'No mentions yet'}
          </p>
          <p className="text-xs text-light-muted">
            {topicFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Monitoring runs every 4 hours. Check back soon.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map(story => {
            const m = story.primary
            const sentiment = sentimentBadge(m.sentiment)
            const hasRelated = story.related.length > 0
            const isExpanded = expandedStory === story.key

            return (
              <div key={story.key} className="glass-card overflow-hidden">
                {/* Primary article */}
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 hover:bg-cream-100/50 transition group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${sentimentDot(m.sentiment)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {m.first_seen_for_story && (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-wide">First</span>
                        )}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sentiment.cls}`}>{sentiment.text}</span>
                        {m.topic_name && (
                          <span className="text-[10px] text-accent">{m.topic_name}</span>
                        )}
                      </div>
                      <h3 className="font-medium text-sm leading-snug group-hover:text-accent transition line-clamp-2">
                        {m.title || m.url}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        {m.outlet && (
                          <span className="text-[11px] text-muted font-medium">{m.outlet}</span>
                        )}
                        {m.published_at && m.published_at !== m.discovered_at ? (
                          <span className="text-[11px] text-light-muted" title={`Found ${timeAgo(m.discovered_at)}`}>
                            Published {timeAgo(m.published_at)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-light-muted">{timeAgo(m.discovered_at)}</span>
                        )}
                        {hasRelated && (
                          <span className="text-[11px] text-light-muted">+{story.related.length} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>

                {/* Related articles toggle */}
                {hasRelated && (
                  <>
                    <button
                      onClick={() => setExpandedStory(isExpanded ? null : story.key)}
                      className="w-full px-4 py-2 text-left border-t border-border/50 hover:bg-cream-100/30 transition flex items-center gap-2"
                    >
                      <svg
                        className={`w-3 h-3 text-light-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="text-[11px] text-muted">
                        {story.related.length} related article{story.related.length > 1 ? 's' : ''} from other outlets
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/50 bg-cream-100/20">
                        {story.related.map(r => (
                          <a
                            key={r.id}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-4 py-3 pl-8 hover:bg-cream-100/50 transition border-b border-border/30 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-1 h-1 rounded-full shrink-0 ${sentimentDot(r.sentiment)}`} />
                              <span className="text-xs font-medium truncate flex-1">{r.title || r.url}</span>
                              <span className="text-[10px] text-muted shrink-0">{r.outlet}</span>
                              <span className="text-[10px] text-light-muted shrink-0">{r.published_at ? timeAgo(r.published_at) : timeAgo(r.discovered_at)}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
