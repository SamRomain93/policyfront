import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const topicId = request.nextUrl.searchParams.get('topic_id')
  const sentiment = request.nextUrl.searchParams.get('sentiment')
  const since = request.nextUrl.searchParams.get('since') // ISO date string
  const until = request.nextUrl.searchParams.get('until') // ISO date string
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
  const userId = request.nextUrl.searchParams.get('user_id')

  let query = supabase
    .from('mentions')
    .select('*, topics!inner(name, user_id)')
    .order('discovered_at', { ascending: false })
    .limit(Math.min(limit, 200))

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

  if (until) {
    query = query.lte('discovered_at', until)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten topic name into the mention
  const mentions = (data || []).map(m => ({
    ...m,
    topic_name: m.topics?.name || null,
    topics: undefined,
  }))

  return NextResponse.json(mentions)
}
