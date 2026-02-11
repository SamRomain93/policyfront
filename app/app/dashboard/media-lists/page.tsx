'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '../components/AuthGuard'

type MediaList = {
  id: string
  name: string
  description: string | null
  member_count: number
  created_at: string
  updated_at: string
}

export default function MediaListsPage() {
  const { user } = useAuth()
  const [lists, setLists] = useState<MediaList[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchLists = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/media-lists?user_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setLists(data.lists || [])
      }
    } catch (err) {
      console.error('Failed to fetch media lists:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !user?.id) return
    setCreating(true)
    try {
      const res = await fetch('/api/media-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: newName.trim(),
          description: newDesc.trim() || null,
        }),
      })
      if (res.ok) {
        setNewName('')
        setNewDesc('')
        setShowCreate(false)
        fetchLists()
      }
    } catch (err) {
      console.error('Failed to create list:', err)
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Media Lists</h1>
          <p className="text-sm text-muted">Curate and save press lists from your journalist database.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New List
        </button>
      </div>

      {/* Create list modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <form
            onSubmit={handleCreate}
            className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4 border border-border"
          >
            <h2 className="font-[family-name:var(--font-serif)] text-xl mb-6">Create Media List</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">List Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. FL Solar Campaign Press List"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional notes about this list"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create List'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm text-muted hover:text-near-black transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lists grid */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading media lists...</p>
        </div>
      ) : lists.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h3 className="font-medium mb-2">No media lists yet</h3>
          <p className="text-sm text-muted mb-4">Create your first press list to start organizing journalist contacts for campaigns.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition"
          >
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <Link
              key={list.id}
              href={`/dashboard/media-lists/${list.id}`}
              className="glass-card p-6 hover:bg-cream-100/50 transition group block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-cream-200 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <svg
                  className="w-4 h-4 text-light-muted group-hover:text-accent transition"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
              <h3 className="font-semibold group-hover:text-accent transition mb-1">{list.name}</h3>
              {list.description && (
                <p className="text-xs text-muted mb-3 line-clamp-2">{list.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-light-muted mt-auto pt-2">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  {list.member_count} {list.member_count === 1 ? 'journalist' : 'journalists'}
                </span>
                <span>Created {formatDate(list.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
