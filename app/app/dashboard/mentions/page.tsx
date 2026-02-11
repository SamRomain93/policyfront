'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/AuthGuard'

type Topic = {
  id: string
  name: string
}

type Mention = {
  id: string
  url: string
  title: string
  outlet: string | null
  excerpt: string | null
  sentiment: string | null
  discovered_at: string
  topic_id: string
  topic_name: string | null
  first_seen_for_story?: boolean
}

function timeAgo(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function sentimentColor(sentiment: string | null) {
  switch (sentiment) {
    case 'positive': return 'bg-emerald-50 text-emerald-700'
    case 'negative': return 'bg-red-50 text-red-700'
    case 'neutral': return 'bg-cream-200 text-muted'
    default: return 'bg-cream-100 text-light-muted'
  }
}

function sentimentDot(sentiment: string | null) {
  switch (sentiment) {
    case 'positive': return 'bg-emerald-500'
    case 'negative': return 'bg-red-500'
    case 'neutral': return 'bg-gray-400'
    default: return 'bg-gray-300'
  }
}

const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
]

export default function MentionsPage() {
  const { user } = useAuth()
  const [mentions, setMentions] = useState<Mention[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [topicFilter, setTopicFilter] = useState('all')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  // Fetch topics for filter dropdown
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
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        params.set('since', today.toISOString())
      } else if (dateFilter === 'week') {
        const week = new Date()
        week.setDate(week.getDate() - 7)
        params.set('since', week.toISOString())
      } else if (dateFilter === 'month') {
        const month = new Date()
        month.setMonth(month.getMonth() - 1)
        params.set('since', month.toISOString())
      }

      const res = await fetch(`/api/mentions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMentions(data)
      }
    } catch (err) {
      console.error('Failed to fetch mentions:', err)
    } finally {
      setLoading(false)
    }
  }, [user, topicFilter, sentimentFilter, dateFilter])

  useEffect(() => {
    fetchMentions()
  }, [fetchMentions])

  // Stats
  const totalCount = mentions.length
  const positiveCount = mentions.filter(m => m.sentiment === 'positive').length
  const negativeCount = mentions.filter(m => m.sentiment === 'negative').length
  const neutralCount = mentions.filter(m => m.sentiment === 'neutral').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">
          Mentions
        </h1>
        <p className="text-sm text-muted">Media coverage discovered across your topics.</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold">{totalCount}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Total</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold text-emerald-600">{positiveCount}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Positive</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold text-red-600">{negativeCount}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Negative</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="font-[family-name:var(--font-serif)] text-2xl font-bold text-gray-500">{neutralCount}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Neutral</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Topic filter */}
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-sm text-near-black focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
        >
          <option value="all">All Topics</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* Sentiment filter */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
          {['all', 'positive', 'negative', 'neutral'].map(s => (
            <button
              key={s}
              onClick={() => setSentimentFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                sentimentFilter === s
                  ? s === 'positive' ? 'bg-emerald-50 text-emerald-700'
                    : s === 'negative' ? 'bg-red-50 text-red-700'
                    : s === 'neutral' ? 'bg-gray-100 text-gray-600'
                    : 'bg-near-black text-cream-50'
                  : 'text-muted hover:text-near-black'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
          {DATE_PRESETS.map(d => (
            <button
              key={d.value}
              onClick={() => setDateFilter(d.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                dateFilter === d.value
                  ? 'bg-near-black text-cream-50'
                  : 'text-muted hover:text-near-black'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Active filter indicator */}
        {(topicFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all') && (
          <button
            onClick={() => { setTopicFilter('all'); setSentimentFilter('all'); setDateFilter('all') }}
            className="text-xs text-accent hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mentions list */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading mentions...</p>
        </div>
      ) : mentions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 text-light-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
          </svg>
          <p className="text-muted mb-2">
            {topicFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all'
              ? 'No mentions match your filters'
              : 'No mentions yet'}
          </p>
          <p className="text-sm text-light-muted">
            {topicFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'Mentions will appear here once monitoring runs on your active topics.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map((mention) => (
            <a
              key={mention.id}
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-5 block hover:bg-white/70 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Sentiment dot */}
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${sentimentDot(mention.sentiment)}`} />

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[15px] mb-1 group-hover:text-accent transition line-clamp-1">
                    {mention.title || mention.url}
                  </h3>
                  {mention.excerpt && (
                    <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-3">
                      {mention.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    {mention.first_seen_for_story && (
                      <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                        FIRST
                      </span>
                    )}
                    {mention.topic_name && (
                      <span className="text-[11px] font-medium text-accent bg-accent/5 px-2 py-0.5 rounded">
                        {mention.topic_name}
                      </span>
                    )}
                    {mention.first_seen_for_story && (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        FIRST
                      </span>
                    )}
                    {mention.outlet && (
                      <span className="text-[11px] font-medium text-muted uppercase tracking-wide">
                        {mention.outlet}
                      </span>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${sentimentColor(mention.sentiment)}`}>
                      {mention.sentiment || 'unscored'}
                    </span>
                    <span className="text-[11px] text-light-muted">
                      {timeAgo(mention.discovered_at)}
                    </span>
                  </div>
                </div>

                <svg className="w-4 h-4 text-light-muted group-hover:text-accent transition flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}