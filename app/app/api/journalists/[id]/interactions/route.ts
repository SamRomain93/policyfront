import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

// GET interactions for a journalist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

  const { data, error } = await supabase
    .from('journalist_interactions')
    .select('*')
    .eq('journalist_id', id)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 200))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - create a new interaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { type, subject, body: interactionBody, outcome, related_mention_id, user_id } = body

    if (!type || !subject || !user_id) {
      return NextResponse.json(
        { error: 'type, subject, and user_id are required' },
        { status: 400 }
      )
    }

    const validTypes = ['pitch', 'email', 'call', 'meeting', 'note', 'response']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('journalist_interactions')
      .insert([{
        journalist_id: id,
        user_id,
        type,
        subject,
        body: interactionBody || null,
        outcome: outcome || null,
        related_mention_id: related_mention_id || null,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
