'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useAuth } from '../../components/AuthGuard'

type Journalist = {
  id: string
  name: string
  outlet: string | null
  email: string | null
  phone: string | null
  state: string | null
  beat: string[] | null
  article_count: number
  avg_sentiment: number | null
}

type Member = {
  id: string
  journalist_id: string
  added_at: string
  journalist: Journalist | null
}

type MediaList = {
  id: string
  name: string
  description: string | null
  member_count: number
  created_at: string
  updated_at: string
  members: Member[]
}

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastId = 0

export default function MediaListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  useAuth() // ensure authenticated
  const [list, setList] = useState<MediaList | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Search panel state
  const [search, setSearch] = useState('')
  const [beatFilter, setBeatFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [searchResults, setSearchResults] = useState<Journalist[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchOffset, setSearchOffset] = useState(0)
  const [allBeats, setAllBeats] = useState<string[]>([])
  const [allStates, setAllStates] = useState<string[]>([])
  const [adding, setAdding] = useState<Record<string, boolean>>({})
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const tid = ++toastId
    setToasts(prev => [...prev, { id: tid, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== tid))
    }, 3000)
  }, [])

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/media-lists/${id}`)
      if (res.ok) {
        const data = await res.json()
        setList(data)
        setEditName(data.name)
        setEditDesc(data.description || '')
      }
    } catch (err) {
      console.error('Failed to fetch list:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchSearchResults = useCallback(async (resetResults = true) => {
    setSearchLoading(true)
    try {
      const offset = resetResults ? 0 : searchOffset
      const params = new URLSearchParams({
        limit: '20',
        offset: String(offset),
      })
      if (search.trim()) params.set('search', search.trim())
      if (beatFilter) params.set('beat', beatFilter)
      if (stateFilter) params.set('state', stateFilter)

      const res = await fetch(`/api/journalists?${params}`)
      if (res.ok) {
        const data = await res.json()
        const journalists = data.journalists || []
        if (resetResults) {
          setSearchResults(journalists)
          setSearchOffset(20)
        } else {
          setSearchResults(prev => [...prev, ...journalists])
          setSearchOffset(prev => prev + 20)
        }
        setSearchTotal(data.total || 0)

        // Collect beats and states
        const beats = new Set<string>()
        const states = new Set<string>()
        journalists.forEach((j: Journalist) => {
          j.beat?.forEach(b => beats.add(b))
          if (j.state) states.add(j.state)
        })
        if (resetResults) {
          setAllBeats(prev => {
            const merged = new Set([...prev, ...beats])
            return Array.from(merged).sort()
          })
          setAllStates(prev => {
            const merged = new Set([...prev, ...states])
            return Array.from(merged).sort()
          })
        }
      }
    } catch (err) {
      console.error('Failed to search journalists:', err)
    } finally {
      setSearchLoading(false)
    }
  }, [search, beatFilter, stateFilter, searchOffset])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const timer = setTimeout(() => fetchSearchResults(true), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search, beatFilter, stateFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Also load initial filter options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await fetch('/api/journalists?limit=200')
        if (res.ok) {
          const data = await res.json()
          const beats = new Set<string>()
          const states = new Set<string>()
          for (const j of data.journalists || []) {
            if (j.beat) j.beat.forEach((b: string) => beats.add(b))
            if (j.state) states.add(j.state)
          }
          setAllBeats(Array.from(beats).sort())
          setAllStates(Array.from(states).sort())
        }
      } catch { /* ignore */ }
    }
    loadFilters()
  }, [])

  const memberIds = new Set((list?.members || []).map(m => m.journalist_id))

  const handleSaveName = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/media-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc }),
      })
      if (res.ok) {
        setEditingName(false)
        fetchList()
        showToast('List updated')
      }
    } catch (err) {
      console.error('Failed to update list:', err)
      showToast('Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddJournalist = async (journalistId: string, journalistName: string) => {
    setAdding(prev => ({ ...prev, [journalistId]: true }))
    try {
      const res = await fetch(`/api/media-lists/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalist_ids: [journalistId] }),
      })
      if (res.ok) {
        fetchList()
        showToast(`Added ${journalistName}`)
      }
    } catch (err) {
      console.error('Failed to add journalist:', err)
      showToast('Failed to add', 'error')
    } finally {
      setAdding(prev => ({ ...prev, [journalistId]: false }))
    }
  }

  const handleRemoveJournalist = async (journalistId: string, journalistName: string) => {
    setRemoving(prev => ({ ...prev, [journalistId]: true }))
    try {
      const res = await fetch(`/api/media-lists/${id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalist_ids: [journalistId] }),
      })
      if (res.ok) {
        fetchList()
        showToast(`Removed ${journalistName}`)
      }
    } catch (err) {
      console.error('Failed to remove journalist:', err)
      showToast('Failed to remove', 'error')
    } finally {
      setRemoving(prev => ({ ...prev, [journalistId]: false }))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/media-lists/${id}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/dashboard/media-lists'
      }
    } catch (err) {
      console.error('Failed to delete list:', err)
      showToast('Failed to delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted">Loading list...</p>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="glass-card p-12 text-center">
        <h3 className="font-medium mb-2">List not found</h3>
        <Link href="/dashboard/media-lists" className="text-sm text-accent hover:underline">
          Back to Media Lists
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/media-lists"
          className="text-xs text-muted hover:text-near-black transition flex items-center gap-1 mb-4"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Media Lists
        </Link>

        {editingName ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="font-[family-name:var(--font-serif)] text-2xl bg-transparent border-b-2 border-accent/40 focus:outline-none focus:border-accent w-full"
              autoFocus
            />
            <input
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Add a description..."
              className="text-sm text-muted bg-transparent border-b border-border focus:outline-none focus:border-accent/40 w-full"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="bg-near-black text-cream-50 px-4 py-1.5 rounded-full text-xs font-medium hover:bg-near-black/85 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditingName(false); setEditName(list.name); setEditDesc(list.description || '') }}
                className="text-xs text-muted hover:text-near-black transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">{list.name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-light-muted hover:text-near-black transition p-1"
                  title="Edit list name"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </button>
              </div>
              {list.description && <p className="text-sm text-muted">{list.description}</p>}
              <div className="flex items-center gap-3 text-xs text-light-muted mt-1">
                <span>{list.member_count} {list.member_count === 1 ? 'journalist' : 'journalists'}</span>
                <span>Created {new Date(list.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(`/api/media-lists/${id}/export`, '_blank')}
                className="border border-border text-sm px-4 py-2 rounded-full hover:bg-cream-100 transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="border border-red-200 text-red-600 text-sm px-4 py-2 rounded-full hover:bg-red-50 transition"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 border border-border">
            <h3 className="font-semibold mb-2">Delete this list?</h3>
            <p className="text-sm text-muted mb-6">
              This will permanently delete &quot;{list.name}&quot; and remove all members. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete List'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-sm text-muted hover:text-near-black transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Current Members */}
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">
            Current Members ({list.member_count})
          </h2>
          {list.members.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <p className="text-sm text-muted">No members yet. Use the search panel to add journalists.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.members.map(m => {
                if (!m.journalist) return null
                const j = m.journalist
                return (
                  <div key={m.id} className="glass-card p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-muted">
                          {j.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/journalists/${j.id}`}
                          className="font-medium text-sm hover:text-accent transition truncate block"
                        >
                          {j.name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap">
                          {j.state && (
                            <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{j.state}</span>
                          )}
                          {j.outlet && <span className="truncate">{j.outlet}</span>}
                          {j.beat && j.beat.length > 0 && (
                            <>
                              {j.beat.slice(0, 2).map(b => (
                                <span key={b} className="text-[10px] text-muted bg-cream-200 px-1.5 py-0.5 rounded">{b}</span>
                              ))}
                            </>
                          )}
                        </div>
                        {j.email && (
                          <div className="text-[11px] text-light-muted truncate">{j.email}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveJournalist(j.id, j.name)}
                      disabled={removing[j.id]}
                      className="text-light-muted hover:text-red-500 transition p-1 shrink-0 disabled:opacity-50"
                      title="Remove from list"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Add Journalists Panel */}
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted mb-3">
            Add Journalists
          </h2>
          <div className="glass-card p-4 space-y-3">
            {/* Search */}
            <div className="relative">
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

            {/* Filters */}
            <div className="flex gap-2">
              {allStates.length > 0 && (
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-near-black text-xs focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                >
                  <option value="">All States</option>
                  {allStates.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              {allBeats.length > 0 && (
                <select
                  value={beatFilter}
                  onChange={(e) => setBeatFilter(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-near-black text-xs focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                >
                  <option value="">All Beats</option>
                  {allBeats.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[500px] overflow-y-auto space-y-1.5">
              {searchLoading && searchResults.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-muted">No journalists found. Try a different search.</p>
                </div>
              ) : (
                <>
                  {searchResults.map(j => {
                    const inList = memberIds.has(j.id)
                    return (
                      <div key={j.id} className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg hover:bg-cream-100/50 transition">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{j.name}</span>
                            {j.state && (
                              <span className="text-[10px] font-bold text-accent bg-accent/10 px-1 py-0.5 rounded">{j.state}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted">
                            {j.outlet && <span className="truncate">{j.outlet}</span>}
                            {j.beat && j.beat.length > 0 && (
                              <>
                                {j.outlet && <span>-</span>}
                                {j.beat.slice(0, 2).map(b => (
                                  <span key={b} className="text-[10px] text-muted bg-cream-200 px-1 py-0.5 rounded">{b}</span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        {inList ? (
                          <span className="text-emerald-600 shrink-0 p-1" title="Already in list">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddJournalist(j.id, j.name)}
                            disabled={adding[j.id]}
                            className="border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs px-2.5 py-1 rounded-full transition shrink-0 disabled:opacity-50 font-medium"
                          >
                            {adding[j.id] ? '...' : 'Add'}
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {/* Load more */}
                  {searchResults.length < searchTotal && (
                    <button
                      onClick={() => fetchSearchResults(false)}
                      disabled={searchLoading}
                      className="w-full py-2 text-xs text-muted hover:text-near-black font-medium transition disabled:opacity-50"
                    >
                      {searchLoading ? 'Loading...' : `Load more (${searchResults.length} of ${searchTotal})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-near-black text-cream-50'
                : 'bg-red-600 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
