import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

// GET coverage (articles) for a journalist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
  const userId = request.nextUrl.searchParams.get('user_id')

  // If user_id provided, scope coverage to their topics only
  let topicIds: string[] | null = null
  if (userId) {
    const { data: userTopics } = await supabase
      .from('topics')
      .select('id')
      .eq('user_id', userId)
    topicIds = (userTopics || []).map(t => t.id)
  }

  // Get articles from journalist_coverage join table
  let coverageQuery = supabase
    .from('journalist_coverage')
    .select('mention_id, topic_id, created_at, mentions(id, title, url, outlet, excerpt, sentiment, published_at, discovered_at), topics(name)')
    .eq('journalist_id', id)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 200))

  if (topicIds && topicIds.length > 0) {
    coverageQuery = coverageQuery.in('topic_id', topicIds)
  }

  const { data: coverageLinks } = await coverageQuery

  // Also get mentions directly linked via journalist_id on mentions table
  let mentionsQuery = supabase
    .from('mentions')
    .select('id, title, url, outlet, excerpt, sentiment, published_at, discovered_at, topic_id, topics(name)')
    .eq('journalist_id', id)
    .order('discovered_at', { ascending: false })
    .limit(Math.min(limit, 200))

  if (topicIds && topicIds.length > 0) {
    mentionsQuery = mentionsQuery.in('topic_id', topicIds)
  }

  const { data: directMentions } = await mentionsQuery

  // Merge and deduplicate
  const seen = new Set<string>()
  const articles: Array<{
    id: string
    title: string
    url: string
    outlet: string
    excerpt: string
    sentiment: string | null
    published_at: string
    discovered_at: string
    topic_name: string | null
  }> = []

  // Add coverage-linked articles
  if (coverageLinks) {
    for (const link of coverageLinks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mention = link.mentions as any
      if (mention && !seen.has(mention.id as string)) {
        seen.add(mention.id as string)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topics = link.topics as any
        articles.push({
          id: mention.id as string,
          title: (mention.title as string) || '',
          url: (mention.url as string) || '',
          outlet: (mention.outlet as string) || '',
          excerpt: (mention.excerpt as string) || '',
          sentiment: mention.sentiment as string | null,
          published_at: (mention.published_at as string) || '',
          discovered_at: (mention.discovered_at as string) || '',
          topic_name: (topics?.name as string) || null,
        })
      }
    }
  }

  // Add directly linked mentions
  if (directMentions) {
    for (const mention of directMentions) {
      if (!seen.has(mention.id)) {
        seen.add(mention.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topics = mention.topics as any
        articles.push({
          id: mention.id,
          title: mention.title || '',
          url: mention.url || '',
          outlet: mention.outlet || '',
          excerpt: mention.excerpt || '',
          sentiment: mention.sentiment,
          published_at: mention.published_at || '',
          discovered_at: mention.discovered_at || '',
          topic_name: (topics?.name as string) || null,
        })
      }
    }
  }

  // Sort by published date descending
  articles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())

  return NextResponse.json(articles)
}
