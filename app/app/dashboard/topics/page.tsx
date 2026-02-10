'use client'

import { useState, useEffect, useCallback } from 'react'

type Topic = {
  id: string
  name: string
  type: 'bill' | 'topic'
  state: string | null
  keywords: string[]
  bill_ids: string[]
  active: boolean
  created_at: string
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC','US'
]

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<'bill' | 'topic'>('topic')
  const [state, setState] = useState('')
  const [keywords, setKeywords] = useState('')
  const [billIds, setBillIds] = useState('')

  const fetchTopics = useCallback(async () => {
    try {
      const res = await fetch('/api/topics')
      if (res.ok) {
        const data = await res.json()
        setTopics(data)
      }
    } catch (err) {
      console.error('Failed to fetch topics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          state: state || null,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          bill_ids: billIds.split(',').map(b => b.trim()).filter(Boolean),
        }),
      })

      if (res.ok) {
        setName('')
        setType('topic')
        setState('')
        setKeywords('')
        setBillIds('')
        setShowForm(false)
        fetchTopics()
      }
    } catch (err) {
      console.error('Failed to create topic:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-3xl sm:text-4xl mb-2">
            Topics
          </h1>
          <p className="text-muted">Bills and policy areas you&apos;re monitoring.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Topic
        </button>
      </div>

      {/* Add topic form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-8 mb-8">
          <h2 className="font-semibold text-lg mb-6">New Topic</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. California Solar Checkoff"
                required
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'bill' | 'topic')}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
              >
                <option value="topic">Policy Topic</option>
                <option value="bill">Specific Bill</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
              >
                <option value="">All / Federal</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. solar checkoff, renewable energy fee"
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
              />
            </div>
            {type === 'bill' && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Bill IDs (comma-separated)</label>
                <input
                  type="text"
                  value={billIds}
                  onChange={(e) => setBillIds(e.target.value)}
                  placeholder="e.g. AB-1290, SB-846"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-white text-near-black placeholder:text-light-muted focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-6">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="bg-near-black text-cream-50 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create Topic'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-muted hover:text-near-black transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Topics list */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading topics...</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 text-light-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-muted mb-2">No topics yet</p>
          <p className="text-sm text-light-muted mb-4">Create your first topic to start monitoring</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-near-black text-cream-50 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-near-black/85 transition"
            >
              Add Topic
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic.id} className="glass-card p-6 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-base">{topic.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    topic.type === 'bill'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {topic.type === 'bill' ? 'Bill' : 'Topic'}
                  </span>
                  {topic.state && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cream-200 text-muted">
                      {topic.state}
                    </span>
                  )}
                  {!topic.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cream-200 text-light-muted">
                      Paused
                    </span>
                  )}
                </div>
                {topic.keywords.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {topic.keywords.map((kw, i) => (
                      <span key={i} className="text-xs bg-cream-100 text-muted px-2 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={async () => {
                    await fetch(`/api/topics/${topic.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ active: !topic.active }),
                    })
                    fetchTopics()
                  }}
                  className="text-xs text-muted hover:text-near-black transition px-2 py-1 rounded hover:bg-cream-100"
                  title={topic.active ? 'Pause monitoring' : 'Resume monitoring'}
                >
                  {topic.active ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${topic.name}" and all its mentions?`)) return
                    await fetch(`/api/topics/${topic.id}`, { method: 'DELETE' })
                    fetchTopics()
                  }}
                  className="text-xs text-light-muted hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50"
                  title="Delete topic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
