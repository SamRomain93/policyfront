import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id } = await params

  // Get the list
  const { data: list, error: listError } = await supabase
    .from('media_lists')
    .select('*')
    .eq('id', id)
    .single()

  if (listError || !list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // Get members with journalist details
  const { data: members, error: membersError } = await supabase
    .from('media_list_members')
    .select('id, journalist_id, added_at')
    .eq('list_id', id)
    .order('added_at', { ascending: false })

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  // Fetch journalist details for all members
  const journalistIds = (members || []).map(m => m.journalist_id)
  let journalists: Record<string, unknown>[] = []

  if (journalistIds.length > 0) {
    const { data: jData } = await supabase
      .from('journalists')
      .select('id, name, outlet, email, phone, twitter, linkedin, state, beat, article_count, avg_sentiment, last_article_date')
      .in('id', journalistIds)

    journalists = jData || []
  }

  // Merge journalist data into members
  const journalistMap = new Map(journalists.map(j => [j.id, j]))
  const membersWithDetails = (members || []).map(m => ({
    ...m,
    journalist: journalistMap.get(m.journalist_id) || null,
  }))

  return NextResponse.json({
    ...list,
    member_count: membersWithDetails.length,
    members: membersWithDetails,
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined) updates.description = body.description?.trim() || null

    const { data, error } = await supabase
      .from('media_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id } = await params

  const { error } = await supabase
    .from('media_lists')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
