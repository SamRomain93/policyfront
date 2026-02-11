import { getSupabase } from '@/app/lib/supabase'
import { NextRequest } from 'next/server'

function escapeCsv(val: string | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return new Response('Database not configured', { status: 503 })
  }

  const search = request.nextUrl.searchParams.get('search')
  const beat = request.nextUrl.searchParams.get('beat')
  const stateParam = request.nextUrl.searchParams.get('state')
  const userId = request.nextUrl.searchParams.get('user_id')

  let query = supabase
    .from('journalists')
    .select('name, outlet, email, phone, twitter, linkedin, state, beat, article_count')
    .order('article_count', { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,outlet.ilike.%${search}%`)
  }

  if (stateParam) {
    query = query.eq('state', stateParam)
  }

  if (beat) {
    query = query.contains('beat', [beat])
  }

  const { data, error } = await query

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }

  let journalists = data || []

  // If user_id provided, compute per-user article counts
  if (userId && journalists.length > 0) {
    const { data: userTopics } = await supabase
      .from('topics')
      .select('id')
      .eq('user_id', userId)

    const topicIds = (userTopics || []).map((t: { id: string }) => t.id)

    if (topicIds.length > 0) {
      // We need journalist IDs for the coverage lookup, re-query with IDs
      let idQuery = supabase
        .from('journalists')
        .select('id, name, outlet, email, phone, twitter, linkedin, state, beat, article_count')
        .order('article_count', { ascending: false })

      if (search) idQuery = idQuery.or(`name.ilike.%${search}%,outlet.ilike.%${search}%`)
      if (stateParam) idQuery = idQuery.eq('state', stateParam)
      if (beat) idQuery = idQuery.contains('beat', [beat])

      const { data: fullData } = await idQuery
      if (fullData) {
        const { data: coverageCounts } = await supabase
          .from('journalist_coverage')
          .select('journalist_id, topic_id')
          .in('topic_id', topicIds)

        const countMap: Record<string, number> = {}
        for (const c of coverageCounts || []) {
          countMap[c.journalist_id] = (countMap[c.journalist_id] || 0) + 1
        }

        journalists = fullData.map(j => ({
          ...j,
          article_count: countMap[j.id] || 0,
        }))
        journalists.sort((a, b) => (b.article_count || 0) - (a.article_count || 0))
      }
    }
  }

  // Build CSV
  const header = 'Name,Outlet,Email,Phone,Twitter,LinkedIn,State,Beat,Article Count'
  const rows = journalists.map(j =>
    [
      escapeCsv(j.name),
      escapeCsv(j.outlet),
      escapeCsv(j.email),
      escapeCsv(j.phone),
      escapeCsv(j.twitter),
      escapeCsv(j.linkedin),
      escapeCsv(j.state),
      escapeCsv(Array.isArray(j.beat) ? j.beat.join('; ') : j.beat),
      String(j.article_count || 0),
    ].join(',')
  )

  const csv = [header, ...rows].join('\n')

  // Build filename reflecting active filters
  const parts = ['policyfront', 'press-list']
  if (stateParam) parts.push(stateParam)
  if (beat) parts.push(beat.replace(/\s+/g, '-'))
  const today = new Date().toISOString().slice(0, 10)
  parts.push(today)
  const filename = parts.join('-') + '.csv'

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
