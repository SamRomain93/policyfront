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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  if (!supabase) {
    return new Response('Database not configured', { status: 503 })
  }

  const { id } = await params

  // Get the list name for the filename
  const { data: list } = await supabase
    .from('media_lists')
    .select('name')
    .eq('id', id)
    .single()

  if (!list) {
    return new Response('List not found', { status: 404 })
  }

  // Get member journalist IDs
  const { data: members } = await supabase
    .from('media_list_members')
    .select('journalist_id')
    .eq('list_id', id)

  const journalistIds = (members || []).map(m => m.journalist_id)

  if (journalistIds.length === 0) {
    const header = 'Name,Outlet,Email,Phone,Twitter,LinkedIn,State,Beat,Article Count'
    return new Response(header + '\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(list.name)}.csv"`,
      },
    })
  }

  // Fetch journalist details
  const { data: journalists, error } = await supabase
    .from('journalists')
    .select('name, outlet, email, phone, twitter, linkedin, state, beat, article_count')
    .in('id', journalistIds)
    .order('name', { ascending: true })

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 })
  }

  const header = 'Name,Outlet,Email,Phone,Twitter,LinkedIn,State,Beat,Article Count'
  const rows = (journalists || []).map(j =>
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
  const today = new Date().toISOString().slice(0, 10)
  const filename = `${slugify(list.name)}-${today}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
