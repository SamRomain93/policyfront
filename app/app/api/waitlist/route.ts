import { getSupabase } from '@/app/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      console.log('Waitlist signup (no DB):', email)
      return NextResponse.json({ success: true, queued: true }, { status: 201 })
    }

    const { error } = await supabase
      .from('waitlist')
      .insert([{ email: email.toLowerCase().trim() }])

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'already_joined' }, { status: 409 })
      }
      console.error('Waitlist insert error:', error.message)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
