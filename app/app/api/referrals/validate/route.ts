import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    // Look up the code
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('id, user_id, code, uses_count')
      .eq('code', code.toLowerCase())
      .single()

    if (codeError || !codeData) {
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid referral code' 
      }, { status: 404 })
    }

    // Get referrer info
    const { data: referrerData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', codeData.user_id)
      .single()

    return NextResponse.json({ 
      valid: true,
      code: codeData.code,
      referrerId: codeData.user_id,
      referrerName: referrerData?.name || 'A user'
    })

  } catch (error) {
    console.error('Validate referral code error:', error)
    return NextResponse.json({ 
      error: 'Failed to validate code' 
    }, { status: 500 })
  }
}
