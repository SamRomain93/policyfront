import { getSupabase } from '@/app/lib/supabase'
import { NextResponse, NextRequest } from 'next/server'

// Map specific topic names to broad journalist beat categories
function inferBeat(topicOrKeyword: string): string {
  const lower = topicOrKeyword.toLowerCase()

  // Energy
  if (/solar|energy|nv energy|demand charge|utility|grid|power|electric|renewable|wind|nuclear|oil|gas|fossil/.test(lower)) return 'Energy'
  // Healthcare
  if (/health|medical|pharma|hospital|insurance|medicare|medicaid/.test(lower)) return 'Healthcare'
  // Education
  if (/school|education|charter|university|college|student/.test(lower)) return 'Education'
  // Environment
  if (/environment|climate|emission|pollution|conservation|epa/.test(lower)) return 'Environment'
  // Housing / Real Estate
  if (/housing|real estate|rent|mortgage|zoning|permit|construction/.test(lower)) return 'Housing'
  // Finance / Economy
  if (/finance|banking|tax|budget|economic|gold|silver|crypto/.test(lower)) return 'Finance'
  // Technology
  if (/tech|ai|software|data|cyber|internet|telecom/.test(lower)) return 'Technology'
  // Transportation
  if (/transport|highway|rail|transit|aviation|ev|vehicle/.test(lower)) return 'Transportation'
  // State / Local Government
  if (/legislature|governor|county|city|state|bill|law|regulation|checkoff|site plan/.test(lower)) return 'State Government'
  // Federal Government
  if (/federal|congress|senate|house|white house|executive order/.test(lower)) return 'Federal Government'

  return 'Policy'  // default broad category
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const outlet = request.nextUrl.searchParams.get('outlet')
  const beat = request.nextUrl.searchParams.get('beat')
  const search = request.nextUrl.searchParams.get('search')
  const sort = request.nextUrl.searchParams.get('sort') || 'article_count'
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
  const userId = request.nextUrl.searchParams.get('user_id')

  let query = supabase
    .from('journalists')
    .select('*')
    .limit(Math.min(limit, 200))

  if (search) {
    query = query.or(`name.ilike.%${search}%,outlet.ilike.%${search}%`)
  }

  if (outlet) {
    query = query.eq('outlet', outlet)
  }

  if (beat) {
    query = query.contains('beat', [beat])
  }

  if (sort === 'recent') {
    query = query.order('last_article_date', { ascending: false, nullsFirst: false })
  } else if (sort === 'sentiment') {
    query = query.order('avg_sentiment', { ascending: true, nullsFirst: false })
  } else {
    query = query.order('article_count', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If user_id provided, compute per-user article counts from their topics
  if (userId && data) {
    // Get this user's topic IDs
    const { data: userTopics } = await supabase
      .from('topics')
      .select('id')
      .eq('user_id', userId)

    const topicIds = (userTopics || []).map(t => t.id)

    if (topicIds.length > 0) {
      // Get coverage counts per journalist for this user's topics
      const { data: coverageCounts } = await supabase
        .from('journalist_coverage')
        .select('journalist_id, topic_id')
        .in('topic_id', topicIds)

      const countMap: Record<string, number> = {}
      for (const c of coverageCounts || []) {
        countMap[c.journalist_id] = (countMap[c.journalist_id] || 0) + 1
      }

      // Override article_count with user-scoped count
      for (const j of data) {
        j.article_count = countMap[j.id] || 0
      }
    }

    // Re-sort after adjusting counts
    if (sort === 'article_count' || !sort) {
      data.sort((a: { article_count: number }, b: { article_count: number }) => (b.article_count || 0) - (a.article_count || 0))
    }
  }

  return NextResponse.json(data)
}

// Upsert journalist from extraction
export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { name, outlet, email, phone, twitter, linkedin, website, beat, sentiment, mention_id, topic_id, manual } = body

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    // Manual add: insert a journalist directly without incrementing article_count
    if (manual) {
      const { data: existing } = await supabase
        .from('journalists')
        .select('id')
        .eq('name', name)
        .eq('outlet', outlet || '')
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Journalist already exists', id: existing.id }, { status: 409 })
      }

      const { data, error } = await supabase
        .from('journalists')
        .insert([{
          name,
          outlet: outlet || null,
          email: email || null,
          phone: phone || null,
          twitter: twitter || null,
          linkedin: linkedin || null,
          website: website || null,
          beat: Array.isArray(beat) ? beat : beat ? [beat] : [],
          article_count: 0,
          avg_sentiment: null,
          last_article_date: null,
        }])
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data, { status: 201 })
    }

    // Map topic-specific names to broad beat categories
    const beatCategory = beat ? inferBeat(beat) : null

    // Check if journalist exists
    const { data: existing } = await supabase
      .from('journalists')
      .select('id, article_count, avg_sentiment, beat, email, phone, twitter, linkedin, website')
      .eq('name', name)
      .eq('outlet', outlet || '')
      .maybeSingle()

    if (existing) {
      // Update with new info (don't overwrite existing contact info with null)
      const updates: Record<string, unknown> = {
        article_count: (existing.article_count || 0) + 1,
        last_article_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (email && !existing.email) updates.email = email
      if (phone && !existing.phone) updates.phone = phone
      if (twitter && !existing.twitter) updates.twitter = twitter
      if (linkedin && !existing.linkedin) updates.linkedin = linkedin
      if (website && !existing.website) updates.website = website

      // Update running average sentiment
      if (sentiment !== undefined && sentiment !== null) {
        const oldAvg = existing.avg_sentiment || 0
        const oldCount = existing.article_count || 1
        updates.avg_sentiment = ((oldAvg * oldCount) + sentiment) / (oldCount + 1)
      }

      // Merge beats (broad categories, not specific topics)
      if (beatCategory) {
        const currentBeats: string[] = existing.beat || []
        if (!currentBeats.includes(beatCategory)) {
          updates.beat = [...currentBeats, beatCategory]
        }
      }

      const { data, error } = await supabase
        .from('journalists')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error

      // Link mention to journalist
      if (mention_id) {
        await supabase.from('mentions').update({ journalist_id: data.id }).eq('id', mention_id)

        // Auto-link coverage
        if (topic_id) {
          await supabase.from('journalist_coverage').upsert(
            { journalist_id: data.id, mention_id, topic_id },
            { onConflict: 'journalist_id,mention_id' }
          )
        }
      }

      return NextResponse.json(data)
    } else {
      // Insert new journalist
      const { data, error } = await supabase
        .from('journalists')
        .insert([{
          name,
          outlet: outlet || null,
          email: email || null,
          phone: phone || null,
          twitter: twitter || null,
          linkedin: linkedin || null,
          website: website || null,
          beat: beatCategory ? [beatCategory] : [],
          article_count: 1,
          avg_sentiment: sentiment ?? null,
          last_article_date: new Date().toISOString(),
        }])
        .select()
        .single()

      if (error) throw error

      // Link mention to journalist
      if (mention_id) {
        await supabase.from('mentions').update({ journalist_id: data.id }).eq('id', mention_id)

        // Auto-link coverage
        if (topic_id) {
          await supabase.from('journalist_coverage').upsert(
            { journalist_id: data.id, mention_id, topic_id },
            { onConflict: 'journalist_id,mention_id' }
          )
        }
      }

      return NextResponse.json(data, { status: 201 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
