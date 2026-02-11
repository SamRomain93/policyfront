import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('alert_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return defaults if no prefs exist yet
  return NextResponse.json(data || {
    email_frequency: 'daily',
    topic_filters: [],
    bill_alerts: true,
    sentiment_filter: 'all',
  })
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  try {
    const body = await request.json()
    const { user_id, email_frequency, topic_filters, bill_alerts, sentiment_filter } = body

    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('alert_prefs')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    const prefs = {
      user_id,
      email_frequency: email_frequency || 'daily',
      topic_filters: topic_filters || [],
      bill_alerts: bill_alerts !== false,
      sentiment_filter: sentiment_filter || 'all',
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { data, error } = await supabase
        .from('alert_prefs')
        .update(prefs)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    } else {
      const { data, error } = await supabase
        .from('alert_prefs')
        .insert([prefs])
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data, { status: 201 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
