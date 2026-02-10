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

    // Send email alerts for status changes via SendGrid
    if (alerts.length > 0 && process.env.SENDGRID_API_KEY) {
      // Get user emails for alert recipients
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
      alerts: alerts.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
