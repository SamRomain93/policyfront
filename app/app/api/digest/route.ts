import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'
import sgMail from '@sendgrid/mail'

function sentimentBadge(s: string | null): string {
  switch (s) {
    case 'positive': return '🟢'
    case 'negative': return '🔴'
    case 'neutral': return '⚪'
    default: return '⚫'
  }
}

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
        <td style="padding:12px 16px;border-bottom:1px solid #E5E5E0;">
          <div style="margin-bottom:4px;">
            <span style="font-size:14px;">${sentimentBadge(m.sentiment)}</span>
            <a href="${m.url}" style="color:#1A1A1A;text-decoration:none;font-weight:600;font-size:15px;" target="_blank">
              ${m.title || m.url}
            </a>
          </div>
          ${m.outlet ? `<span style="color:#6B6B6B;font-size:13px;background:#F5F5F0;padding:2px 8px;border-radius:4px;">${m.outlet}</span>` : ''}
          ${m.excerpt ? `<p style="color:#6B6B6B;font-size:13px;margin:8px 0 0;line-height:1.5;">${m.excerpt.substring(0, 200)}${m.excerpt.length > 200 ? '...' : ''}</p>` : ''}
        </td>
      </tr>
    `).join('')

    sections += `
      <div style="margin-bottom:32px;">
        <h2 style="font-size:18px;font-weight:600;color:#1A1A1A;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #2563EB;">
          ${topic}
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${rows}
        </table>
      </div>
    `
  }

  const positiveCount = mentions.filter(m => m.sentiment === 'positive').length
  const negativeCount = mentions.filter(m => m.sentiment === 'negative').length
  const neutralCount = mentions.filter(m => m.sentiment === 'neutral').length

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
    <body style="margin:0;padding:0;background-color:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0 0 4px;font-family:Georgia,serif;">PolicyFront</h1>
          <p style="color:#6B6B6B;font-size:14px;margin:0;">Daily Intelligence Digest</p>
          <p style="color:#9B9B9B;font-size:12px;margin:4px 0 0;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <!-- Stats -->
        <div style="background:white;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #E5E5E0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:center;padding:8px;">
                <div style="font-size:28px;font-weight:700;color:#1A1A1A;">${mentions.length}</div>
                <div style="font-size:12px;color:#6B6B6B;">New Mentions</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div style="font-size:28px;font-weight:700;color:#16A34A;">${positiveCount}</div>
                <div style="font-size:12px;color:#6B6B6B;">Positive</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div style="font-size:28px;font-weight:700;color:#DC2626;">${negativeCount}</div>
                <div style="font-size:12px;color:#6B6B6B;">Negative</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div style="font-size:28px;font-weight:700;color:#6B6B6B;">${neutralCount}</div>
                <div style="font-size:12px;color:#6B6B6B;">Neutral</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Mentions by topic -->
        ${sections}

        <!-- Footer -->
        <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #E5E5E0;">
          <a href="https://policyfront.io/dashboard" style="display:inline-block;background:#1A1A1A;color:#FAFAF8;padding:12px 24px;border-radius:24px;text-decoration:none;font-size:14px;font-weight:500;">
            View Dashboard
          </a>
          <p style="color:#9B9B9B;font-size:11px;margin-top:16px;">
            PolicyFront - The front line for policy intelligence<br>
            <a href="https://policyfront.io" style="color:#9B9B9B;">policyfront.io</a>
          </p>
        </div>
      </div>
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
