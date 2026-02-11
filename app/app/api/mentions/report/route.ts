import { getSupabase } from '@/app/lib/supabase'
import { NextRequest } from 'next/server'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return new Response('Database not configured', { status: 503 })
  }

  const topicId = request.nextUrl.searchParams.get('topic_id')
  const sentiment = request.nextUrl.searchParams.get('sentiment')
  const since = request.nextUrl.searchParams.get('since')
  const userId = request.nextUrl.searchParams.get('user_id')
  const topicName = request.nextUrl.searchParams.get('topic_name')

  let query = supabase
    .from('mentions')
    .select('title, outlet, url, sentiment, published_at, discovered_at, topics!inner(name, user_id)')
    .order('discovered_at', { ascending: false })
    .limit(5000)

  if (userId) {
    query = query.eq('topics.user_id', userId)
  }

  if (topicId && topicId !== 'all') {
    query = query.eq('topic_id', topicId)
  }

  if (sentiment && sentiment !== 'all') {
    query = query.eq('sentiment', sentiment)
  }

  if (since) {
    query = query.gte('discovered_at', since)
  }

  const { data, error } = await query

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }

  const mentions = (data || []).map((m: Record<string, unknown>) => ({
    title: (m.title as string) || 'Untitled',
    outlet: (m.outlet as string) || 'Unknown',
    url: (m.url as string) || '',
    sentiment: (m.sentiment as string) || 'unscored',
    published_at: m.published_at as string | null,
    discovered_at: m.discovered_at as string,
    topic_name: (m.topics as { name?: string } | null)?.name || '',
  }))

  // Summary stats
  const total = mentions.length
  const positive = mentions.filter(m => m.sentiment === 'positive').length
  const negative = mentions.filter(m => m.sentiment === 'negative').length
  const neutral = mentions.filter(m => m.sentiment === 'neutral').length
  const unscored = total - positive - negative - neutral

  // Top outlets
  const outletCounts: Record<string, number> = {}
  for (const m of mentions) {
    if (m.outlet) {
      outletCounts[m.outlet] = (outletCounts[m.outlet] || 0) + 1
    }
  }
  const topOutlets = Object.entries(outletCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Date range
  const dates = mentions
    .map(m => m.published_at || m.discovered_at)
    .filter(Boolean)
    .sort()
  const earliest = dates[0] ? new Date(dates[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'
  const latest = dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  function sentimentColor(s: string): string {
    if (s === 'positive') return '#059669'
    if (s === 'negative') return '#dc2626'
    if (s === 'neutral') return '#6b7280'
    return '#9ca3af'
  }

  function sentimentLabel(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  // Build HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PolicyFront Mentions Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1a1a;
      background: #FAFAF8;
      line-height: 1.6;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }

    @media print {
      body { padding: 20px; background: white; }
      .no-print { display: none !important; }
      a { color: inherit !important; text-decoration: none !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }

    h1 {
      font-family: 'Instrument Serif', serif;
      font-size: 28px;
      font-weight: 400;
      margin-bottom: 4px;
    }

    h2 {
      font-family: 'Instrument Serif', serif;
      font-size: 20px;
      font-weight: 400;
      margin-bottom: 16px;
      margin-top: 32px;
    }

    .subtitle {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .meta {
      color: #9ca3af;
      font-size: 11px;
      margin-bottom: 32px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border: 1px solid #e5e5e3;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }

    .stat-value {
      font-family: 'Instrument Serif', serif;
      font-size: 28px;
    }

    .stat-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }

    .outlets-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 32px;
    }

    .outlet-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: white;
      border: 1px solid #e5e5e3;
      border-radius: 8px;
      font-size: 13px;
    }

    .outlet-count {
      font-weight: 600;
      color: #6b7280;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    thead th {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid #e5e5e3;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
    }

    tbody td {
      padding: 8px 12px;
      border-bottom: 1px solid #f3f3f1;
      vertical-align: top;
    }

    tbody tr:hover { background: #f9f9f7; }

    .sentiment-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }

    .title-link {
      color: #1a1a1a;
      text-decoration: none;
    }

    .title-link:hover {
      color: #7c6a4e;
      text-decoration: underline;
    }

    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1a1a1a;
      color: #FAFAF8;
      border: none;
      padding: 12px 24px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .print-btn:hover { background: #333; }

    .filter-tag {
      display: inline-block;
      background: #f3f3f1;
      border: 1px solid #e5e5e3;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      color: #6b7280;
      margin-right: 6px;
    }
  </style>
</head>
<body>
  <h1>Media Mentions Report</h1>
  <p class="subtitle">
    ${earliest} to ${latest}
    ${topicName ? ` &middot; Topic: ${escapeHtml(topicName)}` : ''}
    ${sentiment && sentiment !== 'all' ? ` &middot; Sentiment: ${sentimentLabel(sentiment)}` : ''}
  </p>
  <p class="meta">Generated ${today} by PolicyFront</p>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total Mentions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #059669">${positive}</div>
      <div class="stat-label">Positive</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #dc2626">${negative}</div>
      <div class="stat-label">Negative</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #6b7280">${neutral + unscored}</div>
      <div class="stat-label">Neutral / Unscored</div>
    </div>
  </div>

  ${topOutlets.length > 0 ? `
  <h2>Top Outlets</h2>
  <div class="outlets-list">
    ${topOutlets.map(([name, count]) => `
      <div class="outlet-row">
        <span>${escapeHtml(name)}</span>
        <span class="outlet-count">${count}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <h2>All Mentions (${total})</h2>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Outlet</th>
        <th>Sentiment</th>
        <th>Date</th>
        <th>Topic</th>
      </tr>
    </thead>
    <tbody>
      ${mentions.map(m => `
        <tr>
          <td>
            ${m.url
              ? `<a class="title-link" href="${escapeHtml(m.url)}" target="_blank">${escapeHtml(m.title)}</a>`
              : escapeHtml(m.title)
            }
          </td>
          <td>${escapeHtml(m.outlet)}</td>
          <td>
            <span class="sentiment-dot" style="background: ${sentimentColor(m.sentiment)}"></span>
            ${sentimentLabel(m.sentiment)}
          </td>
          <td>${m.published_at ? new Date(m.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(m.discovered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
          <td>${escapeHtml(m.topic_name)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <button class="print-btn no-print" onclick="window.print()">
    Print / Save as PDF
  </button>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
