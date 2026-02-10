import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'
import sgMail from '@sendgrid/mail'

function buildDigestHTML(mentions: Array<{
  title: string
  url: string
  outlet: string | null
  sentiment: string | null
  excerpt: string | null
  discovered_at: string
}>, topicNames: Record<string, string>, mentionTopics: Record<string, string>): string {
  const grouped: Record<string, typeof mentions> = {}
  for (const m of mentions) {
    const topicId = mentionTopics[m.url] || 'unknown'
    const topicName = topicNames[topicId] || 'General'
    if (!grouped[topicName]) grouped[topicName] = []
    grouped[topicName].push(m)
  }

  let sections = ''
  for (const [topic, items] of Object.entries(grouped)) {
    const rows = items.map(m => `
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #F0EDE6;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width:6px;vertical-align:top;padding-right:16px;">
                <div style="width:6px;height:6px;border-radius:3px;margin-top:8px;background:${
                  m.sentiment === 'positive' ? '#16A34A' : m.sentiment === 'negative' ? '#DC2626' : '#9B9B9B'
                };"></div>
              </td>
              <td>
                <a href="${m.url}" style="color:#1A1A1A;text-decoration:none;font-size:16px;line-height:1.4;font-weight:500;" target="_blank">
                  ${m.title || m.url}
                </a>
                <div style="margin-top:6px;">
                  ${m.outlet ? `<span style="color:#6B6B6B;font-size:12px;letter-spacing:0.02em;">${m.outlet.toUpperCase()}</span>` : ''}
                </div>
                ${m.excerpt ? `<p style="color:#6B6B6B;font-size:14px;margin:8px 0 0;line-height:1.6;">${m.excerpt.substring(0, 180)}${m.excerpt.length > 180 ? '...' : ''}</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('')

    sections += `
      <div style="margin-bottom:40px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:16px;">
              <h2 style="font-size:13px;font-weight:600;color:#6B6B6B;margin:0;letter-spacing:0.08em;text-transform:uppercase;">${topic}</h2>
            </td>
          </tr>
          ${rows}
        </table>
      </div>
    `
  }

  const positiveCount = mentions.filter(m => m.sentiment === 'positive').length
  const negativeCount = mentions.filter(m => m.sentiment === 'negative').length
  const neutralCount = mentions.filter(m => m.sentiment === 'neutral').length

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
    </head>
    <body style="margin:0;padding:0;background-color:#FAFAF8;-webkit-font-smoothing:antialiased;">
      <!-- Outer wrapper -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <!-- Inner container -->
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

              <!-- Logo + Date -->
              <tr>
                <td style="padding-bottom:40px;text-align:center;">
                  <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#1A1A1A;margin:0 0 8px;letter-spacing:-0.02em;">PolicyFront</h1>
                  <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#9B9B9B;margin:0;">${dateStr}</p>
                </td>
              </tr>

              <!-- Stats bar -->
              <tr>
                <td style="padding-bottom:40px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;border:1px solid #E5E5E0;">
                    <tr>
                      <td style="padding:24px 0;text-align:center;width:25%;border-right:1px solid #F0EDE6;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#1A1A1A;line-height:1;">${mentions.length}</div>
                        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#9B9B9B;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Mentions</div>
                      </td>
                      <td style="padding:24px 0;text-align:center;width:25%;border-right:1px solid #F0EDE6;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#16A34A;line-height:1;">${positiveCount}</div>
                        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#9B9B9B;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Positive</div>
                      </td>
                      <td style="padding:24px 0;text-align:center;width:25%;border-right:1px solid #F0EDE6;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#DC2626;line-height:1;">${negativeCount}</div>
                        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#9B9B9B;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Negative</div>
                      </td>
                      <td style="padding:24px 0;text-align:center;width:25%;">
                        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#6B6B6B;line-height:1;">${neutralCount}</div>
                        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#9B9B9B;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Neutral</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  ${sections}
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="text-align:center;padding:32px 0 40px;">
                  <a href="https://policyfront.io/dashboard" style="display:inline-block;background:#1A1A1A;color:#FAFAF8;padding:14px 32px;border-radius:100px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:500;letter-spacing:0.01em;">
                    Open Dashboard
                  </a>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="border-top:1px solid #E5E5E0;padding-top:32px;text-align:center;">
                  <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1A1A1A;margin:0 0 4px;">PolicyFront</p>
                  <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#9B9B9B;margin:0;">
                    The front line for policy intelligence
                  </p>
                  <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#9B9B9B;margin:16px 0 0;">
                    <a href="https://policyfront.io" style="color:#9B9B9B;text-decoration:none;">policyfront.io</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// GET: Vercel cron trigger
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (expected && cronSecret !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runDigest()
}

// POST: Manual trigger
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.MONITOR_SECRET
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runDigest()
}

async function runDigest() {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SendGrid not configured' }, { status: 503 })
  }

  sgMail.setApiKey(apiKey)

  // Get mentions from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: mentions, error: mentionsError } = await supabase
    .from('mentions')
    .select('*')
    .gte('discovered_at', since)
    .order('discovered_at', { ascending: false })

  if (mentionsError) {
    return NextResponse.json({ error: mentionsError.message }, { status: 500 })
  }

  if (!mentions || mentions.length === 0) {
    return NextResponse.json({ message: 'No new mentions in last 24h', sent: false })
  }

  // Get topic names
  const { data: topics } = await supabase.from('topics').select('id, name')
  const topicNames: Record<string, string> = {}
  const mentionTopics: Record<string, string> = {}
  for (const t of topics || []) {
    topicNames[t.id] = t.name
  }
  for (const m of mentions) {
    if (m.topic_id) mentionTopics[m.url] = m.topic_id
  }

  // Get users to email
  const { data: users } = await supabase
    .from('users')
    .select('email')

  if (!users || users.length === 0) {
    return NextResponse.json({ message: 'No users to email', sent: false })
  }

  const html = buildDigestHTML(mentions, topicNames, mentionTopics)

  let sent = 0
  for (const user of users) {
    try {
      await sgMail.send({
        to: user.email,
        from: {
          email: 'digest@policyfront.io',
          name: 'PolicyFront',
        },
        subject: `PolicyFront: ${mentions.length} new mention${mentions.length === 1 ? '' : 's'} today`,
        html,
      })
      sent++
    } catch (err) {
      console.error('SendGrid error for', user.email, err)
    }
  }

  return NextResponse.json({
    message: 'Digest sent',
    mentions: mentions.length,
    recipients: sent,
  })
}
