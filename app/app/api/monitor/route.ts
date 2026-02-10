import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

// Core monitoring logic shared between GET (Vercel cron) and POST (manual)
async function runMonitor() {
  const supabase = getSupabase()
  if (!supabase) {
    return { error: 'Database not configured', status: 503 }
  }

  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .eq('active', true)

  if (topicsError) {
    return { error: topicsError.message, status: 500 }
  }

  if (!topics || topics.length === 0) {
    return { data: { message: 'No active topics', scanned: 0 } }
  }

  const results = []

  for (const topic of topics) {
    const keywords = topic.keywords as string[]
    if (!keywords || keywords.length === 0) continue

    const query = keywords.join(' OR ')

    try {
      const firecrawlKey = process.env.FIRECRAWL_API_KEY
      if (!firecrawlKey) {
        results.push({ topic: topic.name, error: 'No Firecrawl API key' })
        continue
      }

      const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `${query} policy legislation`,
          limit: 10,
          lang: 'en',
          country: 'us',
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      })

      if (!searchRes.ok) {
        results.push({ topic: topic.name, error: `Firecrawl error: ${searchRes.status}` })
        continue
      }

      const searchData = await searchRes.json()
      const items = searchData.data || []

      let newMentions = 0

      for (const item of items) {
        if (!item.url) continue

        let outlet = ''
        try { outlet = new URL(item.url).hostname.replace('www.', '') } catch { /* skip */ }

        const { error: insertError } = await supabase
          .from('mentions')
          .insert([{
            topic_id: topic.id,
            url: item.url,
            title: item.title || item.metadata?.title || '',
            content: item.markdown?.substring(0, 5000) || '',
            excerpt: item.metadata?.description || item.markdown?.substring(0, 300) || '',
            outlet,
            discovered_at: new Date().toISOString(),
            source_type: 'rss',
          }])

        if (insertError) {
          if (insertError.code !== '23505') {
            console.error('Insert error:', insertError.message)
          }
        } else {
          newMentions++
        }
      }

      results.push({
        topic: topic.name,
        searched: items.length,
        newMentions,
      })
    } catch (err) {
      results.push({ topic: topic.name, error: String(err) })
    }
  }

  return {
    data: {
      message: 'Monitoring complete',
      topics: topics.length,
      results,
      timestamp: new Date().toISOString(),
    },
  }
}

// GET: Called by Vercel Cron
// Vercel cron sends CRON_SECRET header automatically
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (expected && cronSecret !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runMonitor()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data)
}

// POST: Called manually with MONITOR_SECRET
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.MONITOR_SECRET
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runMonitor()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data)
}
