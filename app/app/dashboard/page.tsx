'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './components/AuthGuard'
import ScanStatusIndicator from './components/ScanStatusIndicator'

type Stats = {
  activeTopics: number
  totalMentions: number
  mentionsToday: number
  sentimentBreakdown: { positive: number; negative: number; neutral: number; unscored: number }
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

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentMentions, setRecentMentions] = useState<Mention[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const topicsUrl = user ? `/api/topics?user_id=${user.id}` : '/api/topics'
      const [topicsRes, mentionsRes] = await Promise.all([
        fetch(topicsUrl),
        fetch('/api/mentions'),
      ])

      const topics = topicsRes.ok ? await topicsRes.json() : []
      const mentions = mentionsRes.ok ? await mentionsRes.json() : []

      const today = new Date().toISOString().split('T')[0]
      const mentionsToday = mentions.filter((m: Mention) =>
        m.discovered_at?.startsWith(today)
      ).length

      const sentimentBreakdown = {
        positive: mentions.filter((m: Mention) => m.sentiment === 'positive').length,
        negative: mentions.filter((m: Mention) => m.sentiment === 'negative').length,
        neutral: mentions.filter((m: Mention) => m.sentiment === 'neutral').length,
        unscored: mentions.filter((m: Mention) => !m.sentiment).length,
      }

      setStats({
        activeTopics: topics.filter((t: { active: boolean }) => t.active).length,
        totalMentions: mentions.length,
        mentionsToday,
        sentimentBreakdown,
      })

      setRecentMentions(mentions.slice(0, 8))
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const dominantSentiment = stats
    ? stats.sentimentBreakdown.positive >= stats.sentimentBreakdown.negative
      ? stats.sentimentBreakdown.positive > 0 ? 'Positive' : 'Neutral'
      : 'Negative'
    : '--'

  const sentimentColor = dominantSentiment === 'Positive'
    ? 'text-emerald-600'
    : dominantSentiment === 'Negative'
    ? 'text-red-600'
    : 'text-muted'

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">
              Dashboard
            </h1>
            <p className="text-sm text-muted">Your policy intelligence at a glance.</p>
          </div>
          <ScanStatusIndicator variant="compact" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="glass-card p-6">
          <div className="text-sm text-muted mb-1">Active Topics</div>
          <div className="text-3xl font-bold tracking-tight">
            {loading ? <span className="animate-pulse">--</span> : stats?.activeTopics ?? 0}
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted mb-1">Total Mentions</div>
          <div className="text-3xl font-bold tracking-tight">
            {loading ? <span className="animate-pulse">--</span> : stats?.totalMentions ?? 0}
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted mb-1">Mentions Today</div>
          <div className="text-3xl font-bold tracking-tight">
            {loading ? <span className="animate-pulse">--</span> : stats?.mentionsToday ?? 0}
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted mb-1">Sentiment</div>
          <div className={`text-3xl font-bold tracking-tight ${sentimentColor}`}>
            {loading ? <span className="animate-pulse">--</span> : dominantSentiment}
          </div>
          {stats && stats.totalMentions > 0 && (
            <div className="flex gap-3 mt-2">
              {stats.sentimentBreakdown.positive > 0 && (
                <span className="text-xs text-emerald-600">{stats.sentimentBreakdown.positive} pos</span>
              )}
              {stats.sentimentBreakdown.negative > 0 && (
                <span className="text-xs text-red-600">{stats.sentimentBreakdown.negative} neg</span>
              )}
              {stats.sentimentBreakdown.neutral > 0 && (
                <span className="text-xs text-muted">{stats.sentimentBreakdown.neutral} neu</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <Link href="/dashboard/topics" className="glass-card p-8 hover:bg-white/70 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-accent transition">Manage Topics</h3>
              <p className="text-sm text-muted">Add or edit tracked bills and policy areas</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/mentions" className="glass-card p-8 hover:bg-white/70 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-accent transition">View All Mentions</h3>
              <p className="text-sm text-muted">Browse discovered media coverage</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent mentions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xl">Recent Mentions</h2>
          {recentMentions.length > 0 && (
            <Link href="/dashboard/mentions" className="text-sm text-accent hover:underline">
              View all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Loading...</p>
          </div>
        ) : recentMentions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-12 h-12 text-light-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
            <p className="text-muted mb-2">No mentions yet</p>
            <p className="text-sm text-light-muted">Add a topic to start monitoring media coverage</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMentions.map((mention) => (
              <a
                key={mention.id}
                href={mention.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-5 block hover:bg-white/70 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-1 group-hover:text-accent transition truncate">
                      {mention.title || mention.url}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap">
                      {mention.outlet && (
                        <span className="text-xs text-muted bg-cream-100 px-2 py-0.5 rounded">
                          {mention.outlet}
                        </span>
                      )}
                      <span className="text-xs text-light-muted">
                        {timeAgo(mention.discovered_at)}
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-light-muted group-hover:text-accent transition flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
