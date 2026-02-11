import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30')
  const type = request.nextUrl.searchParams.get('type')

  let query = supabase
    .from('alert_log')
    .select('*')
    .eq('user_id', userId)
    .order('delivered_at', { ascending: false })
    .limit(Math.min(limit, 100))

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// Mark alerts as read
export async function PATCH(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  try {
    const body = await request.json()
    const { alert_ids, user_id } = body

    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    if (alert_ids && Array.isArray(alert_ids)) {
      await supabase
        .from('alert_log')
        .update({ read: true })
        .in('id', alert_ids)
        .eq('user_id', user_id)
    } else {
      // Mark all as read
      await supabase
        .from('alert_log')
        .update({ read: true })
        .eq('user_id', user_id)
        .eq('read', false)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
