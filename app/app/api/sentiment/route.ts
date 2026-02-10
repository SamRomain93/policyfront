import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

// Simple keyword-based sentiment analysis
// Fast, free, no API dependency. Can upgrade to LLM later.
function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase()

  const positiveSignals = [
    'benefit', 'benefits', 'support', 'supports', 'growth', 'opportunity',
    'innovation', 'savings', 'success', 'improve', 'advances', 'progress',
    'bipartisan', 'unanimous', 'approved', 'passed', 'signed into law',
    'clean energy', 'renewable', 'affordable', 'popular', 'investment',
    'incentive', 'tax credit', 'jobs', 'economic', 'consumer protection',
  ]

  const negativeSignals = [
    'oppose', 'opposes', 'opposition', 'threat', 'risk', 'concerns',
    'controversial', 'criticism', 'critics', 'failed', 'defeated', 'blocked',
    'lawsuit', 'penalty', 'burden', 'costly', 'expensive', 'mandated',
    'tax', 'fee', 'surcharge', 'checkoff', 'forced', 'compulsory',
    'anti-solar', 'anti-renewable', 'rollback', 'repeal', 'restrict',
    'lobby', 'lobbyist', 'special interest', 'bailout', 'subsidy',
  ]

  let positiveScore = 0
  let negativeScore = 0

  for (const signal of positiveSignals) {
    if (lower.includes(signal)) positiveScore++
  }
  for (const signal of negativeSignals) {
    if (lower.includes(signal)) negativeScore++
  }

  if (positiveScore > negativeScore + 1) return 'positive'
  if (negativeScore > positiveScore + 1) return 'negative'
  return 'neutral'
}

// POST: Score all unscored mentions
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

  // Get unscored mentions
  const { data: mentions, error } = await supabase
    .from('mentions')
    .select('id, title, excerpt, content')
    .is('sentiment', null)
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!mentions || mentions.length === 0) {
    return NextResponse.json({ message: 'No unscored mentions', scored: 0 })
  }

  let scored = 0

  for (const mention of mentions) {
    const text = [mention.title, mention.excerpt, mention.content]
      .filter(Boolean)
      .join(' ')

    if (!text.trim()) continue

    const sentiment = analyzeSentiment(text)

    const { error: updateError } = await supabase
      .from('mentions')
      .update({ sentiment })
      .eq('id', mention.id)

    if (updateError) {
      console.error('Sentiment update error:', updateError.message)
    } else {
      scored++
    }
  }

  return NextResponse.json({
    message: 'Sentiment analysis complete',
    total: mentions.length,
    scored,
  })
}
