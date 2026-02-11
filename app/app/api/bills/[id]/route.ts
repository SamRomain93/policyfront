import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const { id } = await params

  // Handle both real UUIDs (from bill_tracking) and composite IDs (topic-billnumber fallback)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  if (isUUID) {
    const { error } = await supabase
      .from('bill_tracking')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
