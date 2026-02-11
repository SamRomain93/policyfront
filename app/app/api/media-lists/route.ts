import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  // Get lists with member counts
  const { data: lists, error } = await supabase
    .from('media_lists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get member counts for each list
  const listIds = (lists || []).map(l => l.id)
  const memberCounts: Record<string, number> = {}

  if (listIds.length > 0) {
    const { data: members } = await supabase
      .from('media_list_members')
      .select('list_id')
      .in('list_id', listIds)

    if (members) {
      for (const m of members) {
        memberCounts[m.list_id] = (memberCounts[m.list_id] || 0) + 1
      }
    }
  }

  const listsWithCounts = (lists || []).map(l => ({
    ...l,
    member_count: memberCounts[l.id] || 0,
  }))

  return NextResponse.json({ lists: listsWithCounts })
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { user_id, name, description } = body

    if (!user_id || !name) {
      return NextResponse.json({ error: 'user_id and name required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('media_lists')
      .insert([{
        user_id,
        name: name.trim(),
        description: description?.trim() || null,
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
