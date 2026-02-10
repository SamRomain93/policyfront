'use client'

import { useState, useEffect, useCallback } from 'react'

type Mention = {
  id: string
  url: string
  title: string
  outlet: string | null
  excerpt: string | null
  sentiment: string | null
  discovered_at: string
  topic_id: string
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

export default function MentionsPage() {
  const [mentions, setMentions] = useState<Mention[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMentions = useCallback(async () => {
    try {
      const res = await fetch('/api/mentions')
      if (res.ok) {
        const data = await res.json()
        setMentions(data)
      }
    } catch (err) {
      console.error('Failed to fetch mentions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMentions()
  }, [fetchMentions])

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl mb-2">
          Mentions
        </h1>
        <p className="text-muted">Media coverage discovered across your topics.</p>
      </div>

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
          <p className="text-muted mb-2">No mentions yet</p>
          <p className="text-sm text-light-muted">Mentions will appear here once monitoring runs on your active topics.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mentions.map((mention) => (
            <a
              key={mention.id}
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-6 block hover:bg-white/70 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-1 group-hover:text-accent transition truncate">
                    {mention.title || mention.url}
                  </h3>
                  {mention.excerpt && (
                    <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-3">
                      {mention.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    {mention.outlet && (
                      <span className="text-xs font-medium text-muted bg-cream-100 px-2 py-0.5 rounded">
                        {mention.outlet}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${sentimentColor(mention.sentiment)}`}>
                      {mention.sentiment || 'unscored'}
                    </span>
                    <span className="text-xs text-light-muted">
                      {timeAgo(mention.discovered_at)}
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-light-muted group-hover:text-accent transition flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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
