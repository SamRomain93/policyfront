import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['s.romain93@gmail.com'] // Add admin emails here

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

export async function GET(request: NextRequest) {
  const supabase = getAdminSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  // Verify requester is admin
  const adminEmail = request.nextUrl.searchParams.get('admin_email')
  if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    // Get all users from auth
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers()
    if (usersErr) throw usersErr

    // Get topic counts per user
    const { data: topicCounts } = await supabase
      .from('topics')
      .select('user_id')

    // Get mention counts per user (via topics)
    const { data: mentionCounts } = await supabase
      .from('mentions')
      .select('topic_id, topics!inner(user_id)')

    // Get bill tracking counts per user
    const { data: billCounts } = await supabase
      .from('bill_tracking')
      .select('user_id')

    // Get API usage from monitor logs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: monitorLogs } = await supabase
      .from('monitor_log')
      .select('topic_id, created_at, firecrawl_calls, llm_calls, topics!inner(user_id)')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Aggregate per user
    const userStats = users.map(user => {
      const userTopics = (topicCounts || []).filter(t => t.user_id === user.id)
      const userMentions = (mentionCounts || []).filter(
        (m: Record<string, unknown>) => {
          const topics = m.topics as Record<string, unknown> | null
          return topics?.user_id === user.id
        }
      )
      const userBills = (billCounts || []).filter(b => b.user_id === user.id)

      // API usage
      const userLogs = (monitorLogs || []).filter(
        (l: Record<string, unknown>) => {
          const topics = l.topics as Record<string, unknown> | null
          return topics?.user_id === user.id
        }
      )
      const firecrawlCalls = userLogs.reduce((sum: number, l: Record<string, unknown>) => sum + ((l.firecrawl_calls as number) || 0), 0)
      const llmCalls = userLogs.reduce((sum: number, l: Record<string, unknown>) => sum + ((l.llm_calls as number) || 0), 0)

      // Flag heavy users (arbitrary thresholds for now)
      const isHeavyUser = firecrawlCalls > 500 || llmCalls > 200

      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        topics: userTopics.length,
        mentions: userMentions.length,
        bills: userBills.length,
        api_usage: {
          firecrawl_calls: firecrawlCalls,
          llm_calls: llmCalls,
          total: firecrawlCalls + llmCalls,
        },
        flagged: isHeavyUser,
      }
    })

    // Sort by most recent signup
    userStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      total_users: userStats.length,
      flagged_users: userStats.filter(u => u.flagged).length,
      users: userStats,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
