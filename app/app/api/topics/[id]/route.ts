import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'
import { findBillByNumber, getBill, BILL_STATUS } from '@/app/lib/legiscan'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Delete topic (mentions cascade via FK)
  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Get the old topic to detect changes
  const { data: oldTopic } = await supabase
    .from('topics')
    .select('bill_ids, state, user_id')
    .eq('id', id)
    .single()

  const body = await request.json()
  const { error } = await supabase
    .from('topics')
    .update(body)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-sync bills if bill_ids or state changed
  const newBillIds: string[] = body.bill_ids || oldTopic?.bill_ids || []
  const newState: string = body.state || oldTopic?.state || ''
  const oldBillIds: string[] = oldTopic?.bill_ids || []
  const oldState: string = oldTopic?.state || ''

  const billsChanged = JSON.stringify(newBillIds.sort()) !== JSON.stringify(oldBillIds.sort())
  const stateChanged = newState !== oldState

  if ((billsChanged || stateChanged) && process.env.LEGISCAN_API_KEY) {
    // Fire and forget - don't block the response
    syncBillsForTopic(id, newBillIds, newState, oldTopic?.user_id || null, supabase).catch(err => {
      console.error('Auto bill sync failed:', err)
    })
  }

  return NextResponse.json({ updated: true })
}

// Sync bills for a single topic after edit
async function syncBillsForTopic(
  topicId: string,
  billIds: string[],
  state: string,
  userId: string | null,
  supabase: ReturnType<typeof getSupabase>
) {
  if (!supabase || billIds.length === 0) return

  // Remove bill_tracking entries that are no longer in bill_ids
  const { data: currentTracked } = await supabase
    .from('bill_tracking')
    .select('id, bill_number')
    .eq('topic_id', topicId)

  if (currentTracked) {
    const normalizedNew = new Set(billIds.map(b => b.replace(/[-\s]+/g, '').toLowerCase()))
    for (const tracked of currentTracked) {
      const normalizedTracked = tracked.bill_number.replace(/[-\s]+/g, '').toLowerCase()
      if (!normalizedNew.has(normalizedTracked)) {
        // Bill was removed from topic, delete tracking entry
        await supabase.from('bill_tracking').delete().eq('id', tracked.id)
      }
    }
  }

  // Sync each bill
  for (const billNumber of billIds) {
    try {
      const searchResult = await findBillByNumber(billNumber, state || 'US')
      if (!searchResult) continue

      const bill = await getBill(searchResult.bill_id)
      const statusText = BILL_STATUS[bill.status] || 'Unknown'
      const lastAction = bill.history?.[bill.history.length - 1]

      const billData = {
        topic_id: topicId,
        user_id: userId,
        legiscan_bill_id: bill.bill_id,
        bill_number: bill.bill_number,
        state: bill.state,
        title: bill.title,
        description: bill.description,
        status: bill.status,
        status_text: statusText,
        status_date: bill.status_date,
        change_hash: bill.change_hash,
        current_body: bill.current_body,
        committee_name: bill.committee?.name || null,
        legiscan_url: bill.url,
        state_url: bill.state_link,
        last_action: lastAction?.action || null,
        last_action_date: lastAction?.date || null,
        sponsors: bill.sponsors?.map(s => ({
          name: s.name,
          party: s.party,
          role: s.role,
          district: s.district,
        })) || [],
        history: bill.history?.slice(-10) || [],
        updated_at: new Date().toISOString(),
      }

      // Upsert
      const { data: existing } = await supabase
        .from('bill_tracking')
        .select('id')
        .eq('legiscan_bill_id', bill.bill_id)
        .eq('topic_id', topicId)
        .maybeSingle()

      if (existing) {
        await supabase.from('bill_tracking').update(billData).eq('id', existing.id)
      } else {
        await supabase.from('bill_tracking').insert([{ ...billData, created_at: new Date().toISOString() }])
      }
    } catch (err) {
      console.error(`Failed to sync bill ${billNumber}:`, err)
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200))
  }
}
