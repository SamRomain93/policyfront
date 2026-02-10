import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const userId = request.nextUrl.searchParams.get('user_id')

  // First try bill_tracking table (synced from LegiScan)
  let trackingQuery = supabase
    .from('bill_tracking')
    .select('*')
    .order('updated_at', { ascending: false })

  if (userId) {
    trackingQuery = trackingQuery.eq('user_id', userId)
  }

  const { data: tracked } = await trackingQuery

  if (tracked && tracked.length > 0) {
    return NextResponse.json(tracked)
  }

  // Fallback: build bill list from topics' bill_ids
  let topicsQuery = supabase
    .from('topics')
    .select('id, name, state, bill_ids, user_id')
    .eq('active', true)
    .not('bill_ids', 'eq', '{}')

  if (userId) {
    topicsQuery = topicsQuery.eq('user_id', userId)
  }

  const { data: topics, error } = await topicsQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!topics || topics.length === 0) {
    return NextResponse.json([])
  }

  // Convert topic bill_ids into bill-like objects for the UI
  const bills = topics.flatMap(topic => {
    const billIds: string[] = topic.bill_ids || []
    return billIds.map(billNumber => ({
      id: `${topic.id}-${billNumber}`,
      topic_id: topic.id,
      topic_name: topic.name,
      user_id: topic.user_id,
      bill_number: billNumber,
      state: topic.state || 'US',
      title: `Tracked via "${topic.name}" topic`,
      status: 0,
      status_text: 'Awaiting Sync',
      status_date: null,
      current_body: null,
      committee_name: null,
      last_action: 'LegiScan sync pending. Add API key to enable live tracking.',
      last_action_date: null,
      legiscan_url: null,
      state_url: null,
      sponsors: [],
      history: [],
      updated_at: new Date().toISOString(),
    }))
  })

  return NextResponse.json(bills)
}
