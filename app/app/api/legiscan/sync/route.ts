import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'
import { findBillByNumber, getBill, BILL_STATUS } from '@/app/lib/legiscan'

// POST /api/legiscan/sync
// Syncs bill status for all tracked topics with bill_ids
// Called by cron every 4 hours alongside media monitoring
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase || !process.env.LEGISCAN_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  try {
    // Get all active topics with bill_ids
    const { data: topics, error: topicsErr } = await supabase
      .from('topics')
      .select('id, name, state, bill_ids, user_id')
      .eq('active', true)
      .not('bill_ids', 'eq', '{}')

    if (topicsErr) throw topicsErr
    if (!topics || topics.length === 0) {
      return NextResponse.json({ message: 'No topics with bill_ids', synced: 0 })
    }

    let synced = 0
    const alerts: Array<{ topic: string; bill: string; status: string; action: string; user_id: string | null }> = []

    for (const topic of topics) {
      const billIds: string[] = topic.bill_ids || []
      const state = topic.state || 'US'

      for (const billNumber of billIds) {
        try {
          // Find the bill in LegiScan
          const searchResult = await findBillByNumber(billNumber, state)
          if (!searchResult) continue

          // Get full bill details
          const bill = await getBill(searchResult.bill_id)
          const statusText = BILL_STATUS[bill.status] || 'Unknown'
          const lastAction = bill.history?.[bill.history.length - 1]

          // Upsert into bill_tracking table
          const { data: existing } = await supabase
            .from('bill_tracking')
            .select('id, status, change_hash')
            .eq('legiscan_bill_id', bill.bill_id)
            .eq('topic_id', topic.id)
            .maybeSingle()

          const billData = {
            topic_id: topic.id,
            user_id: topic.user_id,
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
            history: bill.history?.slice(-10) || [], // last 10 actions
            updated_at: new Date().toISOString(),
          }

          if (existing) {
            // Check if bill changed
            if (existing.change_hash !== bill.change_hash) {
              await supabase
                .from('bill_tracking')
                .update(billData)
                .eq('id', existing.id)

              // Status changed - generate alert
              if (existing.status !== bill.status) {
                alerts.push({
                  topic: topic.name,
                  bill: bill.bill_number,
                  status: statusText,
                  action: lastAction?.action || 'Status updated',
                  user_id: topic.user_id,
                })
              }
            }
          } else {
            // New bill tracking entry
            await supabase
              .from('bill_tracking')
              .insert([{ ...billData, created_at: new Date().toISOString() }])
          }

          synced++
        } catch (err) {
          console.error(`Failed to sync bill ${billNumber} for topic ${topic.name}:`, err)
        }

        // Rate limit: 200ms between API calls
        await new Promise(r => setTimeout(r, 200))
      }
    }

    // Send Telegram alerts for status changes
    if (alerts.length > 0 && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const msg = alerts.map(a =>
        `📋 *${a.bill}* (${a.topic})\nStatus: *${a.status}*\n${a.action}`
      ).join('\n\n')

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `🏛️ *Bill Status Updates*\n\n${msg}`,
          parse_mode: 'Markdown',
        }),
      })
    }

    return NextResponse.json({
      message: 'Sync complete',
      synced,
      alerts: alerts.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
