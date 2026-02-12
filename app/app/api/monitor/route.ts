import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'
import { extractJournalist } from '@/app/lib/journalist-extract'
import { isNewsOutlet } from '@/app/lib/outlet-filter'
import { searchArticles, sentimentLabel, extractAuthorInfo } from '@/app/lib/newsapi-ai'

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

    // Scope by state name, but keep the query broad enough to catch trade/outlet phrasing
    // ("policy legislation" was too restrictive and caused misses like UtilityDive coverage)
    const stateScope = stateName ? ` ${stateName}` : ''
    const query = `(${termQuery})${stateScope}`

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
      let newMentions = 0
      let skipped = 0

      // --- NewsAPI.ai: Primary discovery source ---
      const newsApiKey = process.env.NEWSAPI_AI_KEY
      if (newsApiKey) {
        try {
          // Build a simpler keyword query for NewsAPI.ai (no bill ID expansion needed, just natural language)
          const newsQuery = keywords.map(k => k.includes(' ') ? `"${k}"` : k).join(' OR ')
          const fullQuery = stateName ? `${newsQuery} ${stateName}` : newsQuery

          const newsResult = await searchArticles({
            keyword: fullQuery,
            count: 20,
            sortBy: 'date',
            apiKey: newsApiKey,
          })

          for (const article of newsResult.articles) {
            if (!article.url || knownUrls.has(article.url)) continue

            let outlet = ''
            try { outlet = new URL(article.url).hostname.replace('www.', '') } catch { continue }
            if (!isNewsOutlet(outlet)) continue

            // NewsAPI.ai already provides structured data - no extra scrape needed
            const sentiment = sentimentLabel(article.sentiment)
            const authorInfo = extractAuthorInfo(article.authors)

            const { data: insertedMention } = await supabase
              .from('mentions')
              .insert([{
                topic_id: topic.id,
                url: article.url,
                title: article.title || '',
                outlet,
                excerpt: (article.body || '').substring(0, 500),
                sentiment,
                published_at: article.dateTimePub || new Date().toISOString(),
                discovered_at: new Date().toISOString(),
              }])
              .select('id')
              .single()

            if (insertedMention?.id) {
              knownUrls.add(article.url)
              newMentions++

              // Story clustering via NewsAPI.ai eventUri
              if (article.eventUri) {
                // Check if we have other mentions with same eventUri
                const { data: relatedMentions } = await supabase
                  .from('mentions')
                  .select('id, story_cluster')
                  .eq('topic_id', topic.id)
                  .neq('id', insertedMention.id)
                  .limit(50)

                // Use eventUri as cluster key for dedup
                let matchedCluster: string | null = null
                if (article.isDuplicate) {
                  // NewsAPI.ai says it's a dupe - find the original
                  matchedCluster = relatedMentions?.find(m => m.story_cluster)?.story_cluster || null
                }

                await supabase
                  .from('mentions')
                  .update({
                    story_cluster: matchedCluster || insertedMention.id,
                    first_seen_for_story: !matchedCluster,
                  })
                  .eq('id', insertedMention.id)
              } else {
                await supabase
                  .from('mentions')
                  .update({ story_cluster: insertedMention.id, first_seen_for_story: true })
                  .eq('id', insertedMention.id)
              }

              // Save journalist if author found
              if (authorInfo.name) {
                try {
                  await fetch(`${baseUrl}/api/journalists`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: authorInfo.name,
                      outlet,
                      email: authorInfo.email,
                      beat: topic.name,
                      mention_id: insertedMention.id,
                      topic_id: topic.id,
                    }),
                  })
                } catch { /* best effort */ }
              }
            }
          }
        } catch (err) {
          console.error('NewsAPI.ai search failed for', topic.name, err)
          // Fall through to Firecrawl
        }
      }

      // --- Firecrawl: Secondary/fallback discovery ---
      const searchRes = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 25,
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

      for (const item of items) {
        if (!item.url) continue

        // Skip URLs we already have - no Firecrawl cost for dupes
        if (knownUrls.has(item.url)) {
          skipped++
          continue
        }

        let outlet = ''
        try { outlet = new URL(item.url).hostname.replace('www.', '') } catch { /* skip */ }

        // Skip non-news domains (government sites, bill trackers, social media)
        if (!isNewsOutlet(outlet)) {
          skipped++
          continue
        }

        // Scrape full content only for NEW articles (worth the cost for sentiment + journalist extraction)
        let fullContent = ''
        let rawHtml = ''
        let scrapeMetadata: Record<string, unknown> = {}
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
            scrapeMetadata = scrapeData.data?.metadata || {}
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
                model: 'claude-3-haiku-20240307',
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

        // Extract publish date: try Firecrawl metadata, then HTML meta tags, then fallback to now
        let publishedAt = scrapeMetadata?.publishedDate as string || scrapeMetadata?.published_date as string || item.metadata?.published_date || item.metadata?.publishedDate || ''
        if (!publishedAt && rawHtml) {
          // Try common meta tags for publish date
          const datePatterns = [
            /property="article:published_time"\s+content="([^"]+)"/,
            /name="pubdate"\s+content="([^"]+)"/,
            /name="date"\s+content="([^"]+)"/,
            /property="og:published_time"\s+content="([^"]+)"/,
            /datePublished['"]\s*:\s*['"]([^'"]+)['"]/,
            /"datePublished"\s*:\s*"([^"]+)"/,
          ]
          for (const pattern of datePatterns) {
            const match = rawHtml.match(pattern)
            if (match) {
              const parsed = new Date(match[1])
              if (!isNaN(parsed.getTime())) {
                publishedAt = parsed.toISOString()
                break
              }
            }
          }
        }
        if (!publishedAt) publishedAt = new Date().toISOString()

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
            published_at: publishedAt,
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

          // Coverage attribution: check if this is the first mention for this story cluster
          if (insertedMention?.id) {
            try {
              const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
              const mentionTitle = (item.title || '').toLowerCase()

              // Find existing mentions for same topic in the last 48h with similar titles
              const { data: recentMentions } = await supabase
                .from('mentions')
                .select('id, title, story_cluster, discovered_at')
                .eq('topic_id', topic.id)
                .gte('discovered_at', fortyEightHoursAgo)
                .neq('id', insertedMention.id)
                .order('discovered_at', { ascending: true })

              // Simple title similarity: check if >50% of words overlap
              const titleWords = new Set(mentionTitle.split(/\s+/).filter((w: string) => w.length > 3))
              let matchedCluster: string | null = null

              for (const existing of (recentMentions || [])) {
                const existingWords = new Set((existing.title || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3))
                const overlap = [...titleWords].filter(w => existingWords.has(w)).length
                const similarity = titleWords.size > 0 ? overlap / Math.max(titleWords.size, existingWords.size) : 0

                if (similarity > 0.4) {
                  matchedCluster = existing.story_cluster || existing.id
                  break
                }
              }

              if (matchedCluster) {
                // Part of an existing story cluster
                await supabase
                  .from('mentions')
                  .update({ story_cluster: matchedCluster, first_seen_for_story: false })
                  .eq('id', insertedMention.id)
              } else {
                // First to report this story
                await supabase
                  .from('mentions')
                  .update({ story_cluster: insertedMention.id, first_seen_for_story: true })
                  .eq('id', insertedMention.id)
              }
            } catch {
              // Attribution is best-effort
            }
          }

          // Extract journalist from article content
          if (rawHtml || fullContent) {
            try {
              const journalist = extractJournalist(
                rawHtml || '',
                fullContent || item.metadata?.description || '',
                outlet,
                scrapeMetadata
              )
              if (journalist) {
                await fetch(`${baseUrl}/api/journalists`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...journalist,
                    beat: topic.name,
                    mention_id: insertedMention?.id,
                    topic_id: topic.id,
                  }),
                })
              }
            } catch {
              // Journalist extraction is best-effort, don't fail the monitor
            }
          }

          // Coverage attribution handled above

          // Sentiment scoring via Claude Haiku
          if (insertedMention?.id && process.env.ANTHROPIC_API_KEY && articleText.length > 50) {
            try {
              const sentRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': process.env.ANTHROPIC_API_KEY,
                  'anthropic-version': '2023-06-01',
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'claude-3-haiku-20240307',
                  max_tokens: 20,
                  messages: [{
                    role: 'user',
                    content: `Classify the sentiment of this article toward the topic "${topic.name}" as exactly one word: positive, negative, or neutral.\n\nTitle: ${item.title || ''}\nExcerpt: ${articleText.substring(0, 500)}`,
                  }],
                }),
              })
              if (sentRes.ok) {
                const sentData = await sentRes.json()
                const sentAnswer = (sentData.content?.[0]?.text || '').trim().toLowerCase()
                const sentiment = ['positive', 'negative', 'neutral'].includes(sentAnswer) ? sentAnswer : null
                if (sentiment) {
                  await supabase
                    .from('mentions')
                    .update({ sentiment })
                    .eq('id', insertedMention.id)
                }
              }
            } catch {
              // Sentiment is best-effort
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
}// Force redeploy 1770775137
