import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(
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
    const { journalist_ids } = body

    if (!Array.isArray(journalist_ids) || journalist_ids.length === 0) {
      return NextResponse.json({ error: 'journalist_ids array required' }, { status: 400 })
    }

    // Upsert members to avoid duplicates
    const rows = journalist_ids.map((jId: string) => ({
      list_id: id,
      journalist_id: jId,
    }))

    const { data, error } = await supabase
      .from('media_list_members')
      .upsert(rows, { onConflict: 'list_id,journalist_id' })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update the list's updated_at timestamp
    await supabase
      .from('media_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ added: data?.length || 0 })
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

  try {
    const body = await request.json()
    const { journalist_ids } = body

    if (!Array.isArray(journalist_ids) || journalist_ids.length === 0) {
      return NextResponse.json({ error: 'journalist_ids array required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('media_list_members')
      .delete()
      .eq('list_id', id)
      .in('journalist_id', journalist_ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update the list's updated_at timestamp
    await supabase
      .from('media_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ removed: journalist_ids.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
