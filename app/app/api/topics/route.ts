import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'
import { findBillByNumber, getBill, BILL_STATUS } from '@/app/lib/legiscan'

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Get user_id from query param (set by client with auth)
  const userId = request.nextUrl.searchParams.get('user_id')

  let query = supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { name, type, state, keywords, bill_ids, user_id } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('topics')
      .insert([{
        name,
        type,
        state: state || null,
        keywords: keywords || [],
        bill_ids: bill_ids || [],
        user_id: user_id || null,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-sync bills if any bill_ids provided
    if (data && bill_ids && bill_ids.length > 0 && process.env.LEGISCAN_API_KEY) {
      syncNewTopicBills(data.id, bill_ids, state || '', user_id, supabase).catch(err => {
        console.error('Auto bill sync failed:', err)
      })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

async function syncNewTopicBills(
  topicId: string,
  billIds: string[],
  state: string,
  userId: string | null,
  supabase: ReturnType<typeof getSupabase>
) {
  if (!supabase) return
  for (const billNumber of billIds) {
    try {
      const result = await findBillByNumber(billNumber, state || 'US')
      if (!result) continue
      const bill = await getBill(result.bill_id)
      const statusText = BILL_STATUS[bill.status] || 'Unknown'
      const lastAction = bill.history?.[bill.history.length - 1]

      await supabase.from('bill_tracking').insert([{
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
        sponsors: bill.sponsors?.map(s => ({ name: s.name, party: s.party, role: s.role, district: s.district })) || [],
        history: bill.history?.slice(-10) || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
    } catch (err) {
      console.error(`Failed to sync bill ${billNumber}:`, err)
    }
    await new Promise(r => setTimeout(r, 200))
  }
}
