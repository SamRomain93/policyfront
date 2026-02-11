'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/AuthGuard'

type Topic = { id: string; name: string }

type AlertPrefs = {
  email_frequency: string
  topic_filters: string[]
  bill_alerts: boolean
  sentiment_filter: string
}

type AlertLogEntry = {
  id: string
  type: 'bill_status' | 'mention' | 'digest'
  title: string
  body: string | null
  delivered_at: string
  read: boolean
}

const TYPE_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  bill_status: { icon: '🏛️', color: 'bg-blue-50 text-blue-700', label: 'Bill' },
  mention: { icon: '📰', color: 'bg-amber-50 text-amber-700', label: 'Mention' },
  digest: { icon: '📧', color: 'bg-purple-50 text-purple-700', label: 'Digest' },
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

export default function AlertsPage() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<AlertPrefs>({
    email_frequency: 'daily',
    topic_filters: [],
    bill_alerts: true,
    sentiment_filter: 'all',
  })
  const [topics, setTopics] = useState<Topic[]>([])
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const [prefsRes, topicsRes, alertsRes] = await Promise.all([
        fetch(`/api/alerts/preferences?user_id=${user.id}`),
        fetch(`/api/topics?user_id=${user.id}`),
        fetch(`/api/alerts/log?user_id=${user.id}&limit=30${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}`),
      ])

      if (prefsRes.ok) {
        const p = await prefsRes.json()
        setPrefs(p)
      }
      if (topicsRes.ok) {
        const t = await topicsRes.json()
        if (Array.isArray(t)) setTopics(t)
      }
      if (alertsRes.ok) {
        const a = await alertsRes.json()
        if (Array.isArray(a)) setAlerts(a)
      }
    } catch (err) {
      console.error('Failed to fetch alerts data:', err)
    } finally {
      setLoading(false)
    }
  }, [user, typeFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const savePrefs = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/alerts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...prefs }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const markAllRead = async () => {
    if (!user) return
    await fetch('/api/alerts/log', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }

  const toggleTopicFilter = (topicId: string) => {
    setPrefs(prev => ({
      ...prev,
      topic_filters: prev.topic_filters.includes(topicId)
        ? prev.topic_filters.filter(id => id !== topicId)
        : [...prev.topic_filters, topicId],
    }))
  }

  const unreadCount = alerts.filter(a => !a.read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Alerts</h1>
        <p className="text-sm text-muted">Configure notifications and view alert history.</p>
      </div>

      {/* Preferences */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-[family-name:var(--font-serif)] text-lg mb-5">Alert Preferences</h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Email frequency */}
          <div>
            <label className="block text-sm font-medium mb-2">Email Digest Frequency</label>
            <select
              value={prefs.email_frequency}
              onChange={(e) => setPrefs(prev => ({ ...prev, email_frequency: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
            >
              <option value="realtime">Real-time (as they happen)</option>
              <option value="daily">Daily (noon EST)</option>
              <option value="weekly">Weekly</option>
              <option value="none">None (dashboard only)</option>
            </select>
          </div>

          {/* Sentiment filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Sentiment Focus</label>
            <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
              {[
                { value: 'all', label: 'All' },
                { value: 'negative', label: 'Negative Only' },
                { value: 'positive', label: 'Positive Only' },
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => setPrefs(prev => ({ ...prev, sentiment_filter: s.value }))}
                  className={`flex-1 px-3 py-2.5 rounded-md text-xs font-medium transition ${
                    prefs.sentiment_filter === s.value
                      ? 'bg-near-black text-cream-50'
                      : 'text-muted hover:text-near-black'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bill alerts toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Bill Status Alerts</label>
            <button
              onClick={() => setPrefs(prev => ({ ...prev, bill_alerts: !prev.bill_alerts }))}
              className="flex items-center gap-3"
            >
              <div className={`w-11 h-6 rounded-full transition relative ${prefs.bill_alerts ? 'bg-near-black' : 'bg-cream-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${prefs.bill_alerts ? 'left-[22px]' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-muted">{prefs.bill_alerts ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          {/* Topic filters */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Topics to Alert On
              <span className="text-xs text-light-muted ml-1">(none selected = all)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTopicFilter(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    prefs.topic_filters.includes(t.id)
                      ? 'bg-near-black text-cream-50 border-near-black'
                      : 'bg-white text-muted border-border hover:border-near-black/30'
                  }`}
                >
                  {t.name}
                </button>
              ))}
              {topics.length === 0 && (
                <span className="text-xs text-light-muted">No topics yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
          <button
            onClick={savePrefs}
            disabled={saving}
            className="bg-near-black text-cream-50 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>

      {/* Alert History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-serif)] text-lg">
            Alert History
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                {unreadCount} new
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {/* Type filter */}
            <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
              {['all', 'bill_status', 'mention', 'digest'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    typeFilter === t ? 'bg-near-black text-cream-50' : 'text-muted hover:text-near-black'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'bill_status' ? 'Bills' : t === 'mention' ? 'Mentions' : 'Digests'}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <h3 className="font-medium mb-2">No alerts yet</h3>
            <p className="text-sm text-muted">Alerts will appear here as bill statuses change and new coverage is discovered.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => {
              const typeInfo = TYPE_ICONS[alert.type] || TYPE_ICONS.mention
              return (
                <div
                  key={alert.id}
                  className={`glass-card p-4 flex items-start gap-4 transition ${!alert.read ? 'border-l-2 border-l-accent' : ''}`}
                >
                  <div className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${typeInfo.color}`}>
                    {typeInfo.icon} {typeInfo.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{alert.title}</div>
                    {alert.body && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">{alert.body}</p>
                    )}
                  </div>
                  <div className="text-xs text-light-muted shrink-0">
                    {timeAgo(alert.delivered_at)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
