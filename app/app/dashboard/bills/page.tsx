'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/AuthGuard'
import Link from 'next/link'

type Bill = {
  id: string
  topic_id: string
  bill_number: string
  state: string
  title: string
  status: number
  status_text: string
  status_date: string
  current_body: string
  committee_name: string | null
  last_action: string | null
  last_action_date: string | null
  legiscan_url: string
  state_url: string
  sponsors: Array<{ name: string; party: string; role: string; district: string }>
  history: Array<{ date: string; action: string; chamber: string }>
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  Introduced: 'bg-blue-50 text-blue-700',
  Engrossed: 'bg-yellow-50 text-yellow-700',
  Enrolled: 'bg-orange-50 text-orange-700',
  Passed: 'bg-emerald-50 text-emerald-700',
  Vetoed: 'bg-red-50 text-red-700',
  Failed: 'bg-red-50 text-red-700',
  Override: 'bg-emerald-50 text-emerald-700',
  Chaptered: 'bg-emerald-50 text-emerald-700',
  Draft: 'bg-gray-50 text-gray-600',
  'N/A': 'bg-gray-50 text-gray-600',
  'Awaiting Sync': 'bg-amber-50 text-amber-700',
}

export default function BillsPage() {
  const { user } = useAuth()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/bills?user_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setBills(data)
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const deleteBill = async (billId: string) => {
    try {
      const res = await fetch(`/api/bills/${billId}`, { method: 'DELETE' })
      if (res.ok) {
        setBills(prev => prev.filter(b => b.id !== billId))
        setExpandedId(null)
      }
    } catch {
      // silent
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Bill Tracker</h1>
          <p className="text-sm text-muted">Real-time legislative status via LegiScan</p>
        </div>

      </div>

      {bills.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-medium mb-2">No bills tracked yet</h3>
          <p className="text-sm text-muted mb-6">Add bill IDs to your topics to start tracking legislative status.</p>
          <Link
            href="/dashboard/topics"
            className="inline-flex items-center gap-2 bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition"
          >
            Go to Topics
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => (
            <div key={bill.id} className="glass-card overflow-hidden">
              {/* Bill header */}
              <button
                onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                className="w-full p-5 text-left hover:bg-cream-100/50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-semibold text-base">{bill.state} {bill.bill_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[bill.status_text] || STATUS_COLORS['N/A']}`}>
                        {bill.status_text}
                      </span>
                    </div>
                    <p className="text-sm text-muted line-clamp-2">{bill.title}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {bill.last_action_date && (
                      <span className="text-xs text-light-muted">
                        {new Date(bill.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-muted transition-transform ${expandedId === bill.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === bill.id && (
                <div className="border-t border-border px-5 py-5 space-y-5">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Chamber</div>
                      <div className="text-sm font-medium">{bill.current_body === 'H' ? 'House' : bill.current_body === 'S' ? 'Senate' : bill.current_body || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Committee</div>
                      <div className="text-sm font-medium">{bill.committee_name || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Status Date</div>
                      <div className="text-sm font-medium">{bill.status_date || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-light-muted uppercase tracking-wide mb-1">Last Updated</div>
                      <div className="text-sm font-medium">{new Date(bill.updated_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Sponsors */}
                  {bill.sponsors && bill.sponsors.length > 0 && (
                    <div>
                      <div className="text-xs text-light-muted uppercase tracking-wide mb-2">Sponsors</div>
                      <div className="flex flex-wrap gap-2">
                        {bill.sponsors.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-100 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${s.party === 'D' ? 'bg-blue-500' : s.party === 'R' ? 'bg-red-500' : 'bg-gray-400'}`} />
                            {s.role} {s.name} ({s.party})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent history */}
                  {bill.history && bill.history.length > 0 && (
                    <div>
                      <div className="text-xs text-light-muted uppercase tracking-wide mb-2">Recent History</div>
                      <div className="space-y-2">
                        {bill.history.slice().reverse().slice(0, 5).map((h, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <span className="text-xs text-light-muted whitespace-nowrap pt-0.5">
                              {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-muted">{h.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links + Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      {bill.legiscan_url && (
                        <a href={bill.legiscan_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          LegiScan
                        </a>
                      )}
                      {bill.state_url && (
                        <a href={bill.state_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          State Legislature
                        </a>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBill(bill.id) }}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
