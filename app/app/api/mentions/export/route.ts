import { getSupabase } from '@/app/lib/supabase'
import { NextRequest } from 'next/server'

function escapeCsv(val: string | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return new Response('Database not configured', { status: 503 })
  }

  const topicId = request.nextUrl.searchParams.get('topic_id')
  const sentiment = request.nextUrl.searchParams.get('sentiment')
  const since = request.nextUrl.searchParams.get('since')
  const userId = request.nextUrl.searchParams.get('user_id')

  let query = supabase
    .from('mentions')
    .select('title, outlet, url, sentiment, published_at, discovered_at, topics!inner(name, user_id)')
    .order('discovered_at', { ascending: false })
    .limit(5000)

  if (userId) {
    query = query.eq('topics.user_id', userId)
  }

  if (topicId && topicId !== 'all') {
    query = query.eq('topic_id', topicId)
  }

  if (sentiment && sentiment !== 'all') {
    query = query.eq('sentiment', sentiment)
  }

  if (since) {
    query = query.gte('discovered_at', since)
  }

  const { data, error } = await query

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }

  const mentions = (data || []).map((m: Record<string, unknown>) => ({
    ...m,
    topic_name: (m.topics as { name?: string } | null)?.name || '',
  }))

  // Build CSV
  const header = 'Title,Outlet,URL,Sentiment,Published Date,Discovered Date,Topic'
  const rows = mentions.map((m: Record<string, unknown>) =>
    [
      escapeCsv(m.title as string),
      escapeCsv(m.outlet as string),
      escapeCsv(m.url as string),
      escapeCsv(m.sentiment as string),
      escapeCsv(m.published_at ? new Date(m.published_at as string).toLocaleDateString('en-US') : ''),
      escapeCsv(m.discovered_at ? new Date(m.discovered_at as string).toLocaleDateString('en-US') : ''),
      escapeCsv(m.topic_name as string),
    ].join(',')
  )

  const csv = [header, ...rows].join('\n')

  const today = new Date().toISOString().slice(0, 10)
  const filename = `policyfront-mentions-${today}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
