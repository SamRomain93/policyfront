import { getSupabase } from '@/app/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://policyfront.io/update-password',
    })

    if (error) {
      console.error('Reset error:', error.message)
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
