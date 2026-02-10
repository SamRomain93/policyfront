'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../components/AuthGuard'
import { useRouter } from 'next/navigation'

const ADMIN_EMAILS = ['s.romain93@gmail.com']

type UserStat = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  topics: number
  mentions: number
  bills: number
  api_usage: {
    firecrawl_calls: number
    llm_calls: number
    total: number
  }
  flagged: boolean
}

type AdminData = {
  total_users: number
  flagged_users: number
  users: UserStat[]
}

function timeAgo(date: string | null) {
  if (!date) return 'Never'
  const now = new Date()
  const then = new Date(date)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)

  useEffect(() => {
    if (!user) return
    if (!isAdmin) {
      router.replace('/dashboard')
      return
    }

    fetch(`/api/admin/users?admin_email=${encodeURIComponent(user.email!)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [user, isAdmin, router])

  const activeUsers7d = useMemo(() => {
    if (!data) return 0
    const now = new Date()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    return data.users.filter(u => {
      if (!u.last_sign_in_at) return false
      return now.getTime() - new Date(u.last_sign_in_at).getTime() < sevenDays
    }).length
  }, [data])

  if (!isAdmin) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Admin</h1>
        <p className="text-sm text-muted">User management and API usage monitoring</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 text-center">
          <div className="font-[family-name:var(--font-serif)] text-3xl font-bold">{data.total_users}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Total Users</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="font-[family-name:var(--font-serif)] text-3xl font-bold text-emerald-600">
            {activeUsers7d}
          </div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Active (7d)</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className={`font-[family-name:var(--font-serif)] text-3xl font-bold ${data.flagged_users > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {data.flagged_users}
          </div>
          <div className="text-xs text-muted uppercase tracking-wide mt-1">Flagged</div>
        </div>
      </div>

      {/* User table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">User</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Topics</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Mentions</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Bills</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">API Calls</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Last Active</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id} className={`border-b border-border/50 hover:bg-cream-100/50 transition ${u.flagged ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-near-black">{u.email}</div>
                    <div className="text-xs text-light-muted mt-0.5">
                      Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="text-center px-3 py-4 font-medium">{u.topics}</td>
                  <td className="text-center px-3 py-4 font-medium">{u.mentions}</td>
                  <td className="text-center px-3 py-4 font-medium">{u.bills}</td>
                  <td className="text-center px-3 py-4">
                    <div className="font-medium">{u.api_usage.total}</div>
                    <div className="text-[10px] text-light-muted">
                      {u.api_usage.firecrawl_calls} scrape / {u.api_usage.llm_calls} LLM
                    </div>
                  </td>
                  <td className="text-center px-3 py-4 text-xs text-muted">
                    {timeAgo(u.last_sign_in_at)}
                  </td>
                  <td className="text-center px-3 py-4">
                    {u.flagged ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        Heavy
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                        Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage thresholds info */}
      <div className="mt-6 text-xs text-light-muted">
        <strong>Flag thresholds (30-day rolling):</strong> &gt;500 Firecrawl calls or &gt;200 LLM calls
      </div>
    </div>
  )
}
