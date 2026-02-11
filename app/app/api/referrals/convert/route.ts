import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { referee_id, referral_code } = body

    if (!referee_id || !referral_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Look up the referral code to get referrer
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', referral_code.toLowerCase())
      .single()

    if (codeError || !codeData) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Create conversion record
    const { error: conversionError } = await supabase
      .from('referral_conversions')
      .insert({
        referrer_id: codeData.user_id,
        referee_id,
        referral_code: referral_code.toLowerCase(),
        signed_up_at: new Date().toISOString(),
        credited: false
      })

    if (conversionError) {
      // If duplicate, that's okay (unique constraint on referee_id)
      if (!conversionError.message.includes('unique')) {
        throw conversionError
      }
    }

    // Increment uses_count on the code
    await supabase.rpc('increment_referral_uses', { 
      p_code: referral_code.toLowerCase() 
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Record conversion error:', error)
    return NextResponse.json({ 
      error: 'Failed to record conversion' 
    }, { status: 500 })
  }
}
