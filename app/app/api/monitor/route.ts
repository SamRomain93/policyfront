import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'
import { extractJournalist } from '@/app/lib/journalist-extract'

// Core monitoring logic shared between GET (Vercel cron) and POST (manual)
async function runMonitor(baseUrl: string) {
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
    const billIds = (topic.bill_ids as string[]) || []
    if (keywords.length === 0 && billIds.length === 0) continue

    // Expand bill IDs into all common formats
    // e.g. "SB-954" → "SB-954" OR "SB 954" OR "SB954"
    const expandedBillIds: string[] = []
    for (const bill of billIds) {
      const normalized = bill.replace(/[-\s]/g, '')
      const match = normalized.match(/^([A-Za-z]+)(\d+)$/)
      if (match) {
        const prefix = match[1].toUpperCase()
        const num = match[2]
        expandedBillIds.push(`"${prefix}-${num}"`, `"${prefix} ${num}"`, `"${prefix}${num}"`)
      } else {
        expandedBillIds.push(`"${bill}"`)
      }
    }

    // Build state-scoped search query
    const state = topic.state || ''
    const STATE_NAMES: Record<string, string> = {
      AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
      CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
      IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
      ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
      MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
      NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
      OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
      TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
      WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington DC',
    }
    const stateName = STATE_NAMES[state] || ''

    // Quote multi-word keywords to prevent false matches
    const quotedKeywords = keywords.map((k: string) =>
      k.includes(' ') ? `"${k}"` : k
    )

    const allTerms = [
      ...quotedKeywords,
      ...expandedBillIds,
    ]
    const termQuery = allTerms.join(' OR ')

    // Scope by state name for precision
    const stateScope = stateName ? ` ${stateName}` : ''
    const query = `(${termQuery})${stateScope} policy legislation`

    try {
      const firecrawlKey = process.env.FIRECRAWL_API_KEY
      if (!firecrawlKey) {
        results.push({ topic: topic.name, error: 'No Firecrawl API key' })
        continue
      }

      // Pre-fetch existing URLs to avoid paying Firecrawl for dupes
      const { data: existingMentions } = await supabase
        .from('mentions')
        .select('url')
        .eq('topic_id', topic.id)

      const knownUrls = new Set((existingMentions || []).map((m: { url: string }) => m.url))

      const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 10,
          lang: 'en',
          country: 'us',
        }),
      })

      if (!searchRes.ok) {
        results.push({ topic: topic.name, error: `Firecrawl error: ${searchRes.status}` })
        continue
      }

      const searchData = await searchRes.json()
      const items = searchData.data || []

      let newMentions = 0
      let skipped = 0

      for (const item of items) {
        if (!item.url) continue

        // Skip URLs we already have - no Firecrawl cost for dupes
        if (knownUrls.has(item.url)) {
          skipped++
          continue
        }

        let outlet = ''
        try { outlet = new URL(item.url).hostname.replace('www.', '') } catch { /* skip */ }

        // Scrape full content only for NEW articles (worth the cost for sentiment + journalist extraction)
        let fullContent = ''
        let rawHtml = ''
        try {
          const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: item.url,
              formats: ['markdown', 'html'],
            }),
          })
          if (scrapeRes.ok) {
            const scrapeData = await scrapeRes.json()
            fullContent = scrapeData.data?.markdown?.substring(0, 5000) || ''
            rawHtml = scrapeData.data?.html?.substring(0, 20000) || ''
          }
        } catch {
          // Scrape failed, use metadata only
        }

        // Relevance check: verify article actually relates to this topic
        const articleText = fullContent || item.metadata?.description || item.title || ''
        const topicDesc = `${topic.name}${stateName ? ` in ${stateName}` : ''}: ${keywords.join(', ')}`
        let isRelevant = true

        if (articleText.length > 50 && process.env.ANTHROPIC_API_KEY) {
          try {
            const relRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: 'claude-haiku-4-5-20250501',
                max_tokens: 10,
                messages: [{
                  role: 'user',
                  content: `Is this article relevant to "${topicDesc}"? Reply ONLY "yes" or "no".\n\nTitle: ${item.title || ''}\nExcerpt: ${articleText.substring(0, 500)}`,
                }],
              }),
            })
            if (relRes.ok) {
              const relData = await relRes.json()
              const answer = relData.content?.[0]?.text?.trim().toLowerCase() || ''
              isRelevant = answer.startsWith('yes')
            }
          } catch {
            // If relevance check fails, default to including it
          }
        }

        if (!isRelevant) {
          skipped++
          continue
        }

        const { data: insertedMention, error: insertError } = await supabase
          .from('mentions')
          .insert([{
            topic_id: topic.id,
            url: item.url,
            title: item.title || item.metadata?.title || '',
            content: fullContent || item.metadata?.description || '',
            excerpt: item.metadata?.description || fullContent?.substring(0, 300) || '',
            outlet,
            discovered_at: new Date().toISOString(),
            source_type: 'rss',
          }])
          .select('id')
          .maybeSingle()

        if (insertError) {
          if (insertError.code !== '23505') {
            console.error('Insert error:', insertError.message)
          }
        } else {
          newMentions++

          // Extract journalist from article content
          if (rawHtml || fullContent) {
            try {
              const journalist = extractJournalist(
                rawHtml || '',
                fullContent || item.metadata?.description || '',
                outlet
              )
              if (journalist) {
                await fetch(`${baseUrl}/api/journalists`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...journalist,
                    beat: topic.name,
                    mention_id: insertedMention?.id,
                  }),
                })
              }
            } catch {
              // Journalist extraction is best-effort, don't fail the monitor
            }
          }
        }
      }

      results.push({
        topic: topic.name,
        searched: items.length,
        skipped,
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

  const baseUrl = new URL(request.url).origin
  const result = await runMonitor(baseUrl)
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

  const baseUrl = new URL(request.url).origin
  const result = await runMonitor(baseUrl)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.data)
}
