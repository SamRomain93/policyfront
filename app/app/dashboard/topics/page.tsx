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
              <div>
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
              <div className={`w-2.5 h-2.5 rounded-full ${topic.active ? 'bg-emerald-500' : 'bg-light-muted'}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
