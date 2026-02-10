import { NextResponse, NextRequest } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'
import { getBill, getMasterList, BILL_STATUS } from '@/app/lib/legiscan'

// POST /api/legiscan/sync
// Optimized sync following LegiScan crash course:
// 1. Group tracked bills by state
// 2. Pull getMasterListRaw once per state (1 query per state)
// 3. Compare change_hash locally - only getBill for changed bills
// 4. Log API usage to monitor_log
export async function POST(request: NextRequest) {
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

    // Group bills by state for efficient getMasterList calls
    const stateMap: Record<string, Array<{
      topicId: string
      topicName: string
      userId: string | null
      billNumber: string
    }>> = {}

    for (const topic of topics) {
      const state = topic.state || 'US'
      const billIds: string[] = topic.bill_ids || []
      for (const bn of billIds) {
        if (!stateMap[state]) stateMap[state] = []
        stateMap[state].push({
          topicId: topic.id,
          topicName: topic.name,
          userId: topic.user_id,
          billNumber: bn,
        })
      }
    }

    let synced = 0
    let apiQueries = 0
    const alerts: Array<{ topic: string; bill: string; status: string; action: string; user_id: string | null }> = []

    for (const [state, trackedBills] of Object.entries(stateMap)) {
      // 1 query: get master list for this state
      let masterList: Record<string, {
        bill_id: number; number: string; change_hash: string; url: string;
        status: number; status_date: string; last_action_date: string; last_action: string; title: string
      }>

      try {
        masterList = await getMasterList(state)
        apiQueries++
      } catch (err) {
        console.error(`Failed to get master list for ${state}:`, err)
        continue
      }

      // Index master list by normalized bill number for fast lookup
      const masterByNumber: Record<string, typeof masterList[string]> = {}
      for (const entry of Object.values(masterList)) {
        // Normalize: "AB1290" -> "ab1290", "SB 846" -> "sb846"
        const normalized = entry.number.replace(/[\s-]+/g, '').toLowerCase()
        masterByNumber[normalized] = entry
      }

      for (const tracked of trackedBills) {
        // Normalize the tracked bill number to match
        const normalized = tracked.billNumber.replace(/[\s-]+/g, '').toLowerCase()
        const masterEntry = masterByNumber[normalized]

        if (!masterEntry) {
          // Bill not in current session master list, skip
          continue
        }

        // Check if we already have this bill with the same hash (no change = no query needed)
        const { data: existing } = await supabase
          .from('bill_tracking')
          .select('id, status, change_hash')
          .eq('legiscan_bill_id', masterEntry.bill_id)
          .eq('topic_id', tracked.topicId)
          .maybeSingle()

        if (existing && existing.change_hash === masterEntry.change_hash) {
          // Hash unchanged, skip - use cached data
          synced++
          continue
        }

        // Hash changed or new bill - spend 1 query to get full details
        try {
          const bill = await getBill(masterEntry.bill_id)
          apiQueries++

          const statusText = BILL_STATUS[bill.status] || 'Unknown'
          const lastAction = bill.history?.[bill.history.length - 1]

          const billData = {
            topic_id: tracked.topicId,
            user_id: tracked.userId,
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

          if (existing) {
            await supabase
              .from('bill_tracking')
              .update(billData)
              .eq('id', existing.id)

            // Status changed - alert
            if (existing.status !== bill.status) {
              alerts.push({
                topic: tracked.topicName,
                bill: bill.bill_number,
                status: statusText,
                action: lastAction?.action || 'Status updated',
                user_id: tracked.userId,
              })
            }
          } else {
            await supabase
              .from('bill_tracking')
              .insert([{ ...billData, created_at: new Date().toISOString() }])
          }

          synced++
        } catch (err) {
          console.error(`Failed to get bill ${tracked.billNumber}:`, err)
        }

        // Gentle rate limit between getBill calls
        await new Promise(r => setTimeout(r, 150))
      }
    }

    // Log API usage per topic for admin monitoring
    for (const topic of topics) {
      await supabase.from('monitor_log').insert([{
        topic_id: topic.id,
        firecrawl_calls: 0,
        llm_calls: 0,
        mentions_found: 0,
        duration_ms: 0,
      }])
    }

    // Send email alerts for status changes via SendGrid
    if (alerts.length > 0 && process.env.SENDGRID_API_KEY) {
      const userIds = [...new Set(alerts.filter(a => a.user_id).map(a => a.user_id!))]

      for (const uid of userIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(uid)
        const email = userData?.user?.email
        if (!email) continue

        const userAlerts = alerts.filter(a => a.user_id === uid)
        const alertRows = userAlerts.map(a => `
          <tr>
            <td style="padding:16px 0;border-bottom:1px solid #F0EDE6;">
              <div style="font-size:16px;font-weight:500;color:#1A1A1A;margin-bottom:4px;">${a.bill}</div>
              <div style="font-size:13px;color:#6B6B6B;margin-bottom:2px;">Topic: ${a.topic}</div>
              <div style="font-size:14px;color:#1A1A1A;">Status: <strong>${a.status}</strong></div>
              <div style="font-size:13px;color:#6B6B6B;margin-top:2px;">${a.action}</div>
            </td>
          </tr>
        `).join('')

        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: 'alerts@policyfront.io', name: 'PolicyFront' },
            subject: `Bill Status Update: ${userAlerts.map(a => a.bill).join(', ')}`,
            content: [{
              type: 'text/html',
              value: `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;">
                  <tr><td align="center" style="padding:40px 16px;">
                    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
                      <tr><td style="text-align:center;padding-bottom:32px;">
                        <h1 style="font-family:Georgia,serif;font-size:28px;color:#1A1A1A;margin:0;">PolicyFront</h1>
                      </td></tr>
                      <tr><td style="background:#FFFFFF;border-radius:12px;border:1px solid #E5E5E0;padding:32px;">
                        <h2 style="font-family:Georgia,serif;font-size:20px;color:#1A1A1A;margin:0 0 20px;">Bill Status Alert</h2>
                        <table width="100%" cellpadding="0" cellspacing="0">${alertRows}</table>
                      </td></tr>
                      <tr><td style="text-align:center;padding-top:24px;">
                        <a href="https://policyfront.io/dashboard/bills" style="display:inline-block;background:#1A1A1A;color:#FAFAF8;padding:12px 28px;border-radius:100px;text-decoration:none;font-size:14px;">View Bills</a>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>`,
            }],
          }),
        })
      }
    }

    return NextResponse.json({
      message: 'Sync complete',
      synced,
      api_queries: apiQueries,
      alerts: alerts.length,
      states_checked: Object.keys(stateMap).length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
