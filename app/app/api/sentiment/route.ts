import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

async function scoreSentimentLLM(title: string, excerpt: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral'
  reasoning: string
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { sentiment: keywordScore(title + ' ' + excerpt), reasoning: 'keyword fallback (no API key)' }
  }

  const prompt = `Analyze the sentiment of this policy/media coverage from the perspective of a public affairs professional monitoring legislation and energy policy.

Title: ${title}
Excerpt: ${excerpt}

Classify as exactly one of: positive, negative, neutral

Consider:
- Is this coverage favorable or unfavorable to the policy/bill being discussed?
- Does the framing support or oppose the legislative action?
- Is this neutral reporting or does it take a clear stance?

Respond in JSON only: {"sentiment":"positive|negative|neutral","reasoning":"one sentence why"}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20241022',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 100,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Anthropic error:', res.status, errBody)
      return { sentiment: keywordScore(title + ' ' + excerpt), reasoning: `API ${res.status}: ${errBody.substring(0, 80)}` }
    }

    const data = await res.json()
    const content = data.content?.[0]?.text
    if (!content) {
      return { sentiment: 'neutral', reasoning: 'empty response' }
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[^}]+\}/)
    if (!jsonMatch) {
      return { sentiment: 'neutral', reasoning: 'no JSON in response' }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const sentiment = ['positive', 'negative', 'neutral'].includes(parsed.sentiment)
      ? parsed.sentiment
      : 'neutral'

    return { sentiment, reasoning: parsed.reasoning || '' }
  } catch (err) {
    console.error('LLM sentiment error:', err)
    return { sentiment: keywordScore(title + ' ' + excerpt), reasoning: 'parse error, keyword fallback' }
  }
}

// Keyword fallback
function keywordScore(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase()
  const pos = ['benefit', 'support', 'growth', 'approved', 'passed', 'clean energy',
    'tax credit', 'jobs', 'investment', 'savings', 'bipartisan', 'innovation',
    'consumer protection', 'incentive', 'affordable', 'popular', 'opportunity']
  const neg = ['oppose', 'threat', 'lawsuit', 'costly', 'surcharge', 'checkoff',
    'forced', 'anti-solar', 'rollback', 'lobby', 'special interest', 'burden',
    'controversial', 'criticism', 'defeated', 'blocked', 'penalty', 'repeal']

  let p = 0, n = 0
  for (const s of pos) if (lower.includes(s)) p++
  for (const s of neg) if (lower.includes(s)) n++

  if (p > n + 1) return 'positive'
  if (n > p + 1) return 'negative'
  return 'neutral'
}

// POST: Score unscored mentions with LLM
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.MONITOR_SECRET
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Check for force rescore param
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === 'true'

  let query = supabase
    .from('mentions')
    .select('id, title, excerpt, content')
    .limit(50)

  if (!force) {
    query = query.is('sentiment', null)
  }

  const { data: mentions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!mentions || mentions.length === 0) {
    return NextResponse.json({ message: 'No mentions to score', scored: 0 })
  }

  let scored = 0
  const results: { title: string; sentiment: string; reasoning: string }[] = []

  for (const mention of mentions) {
    const title = mention.title || ''
    const excerpt = mention.excerpt || mention.content?.substring(0, 500) || ''

    if (!title && !excerpt) continue

    const { sentiment, reasoning } = await scoreSentimentLLM(title, excerpt)

    const { error: updateError } = await supabase
      .from('mentions')
      .update({ sentiment })
      .eq('id', mention.id)

    if (updateError) {
      console.error('Update error:', updateError.message)
    } else {
      scored++
      results.push({ title: title.substring(0, 60), sentiment, reasoning })
    }
  }

  return NextResponse.json({
    message: 'Sentiment analysis complete',
    method: process.env.ANTHROPIC_API_KEY ? 'claude-haiku-4.5' : 'keyword',
    total: mentions.length,
    scored,
    results,
  })
}
