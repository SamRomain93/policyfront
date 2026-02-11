import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user's codes
    const { data: codes, error: codesError } = await supabase
      .from('referral_codes')
      .select('id, code, uses_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (codesError) {
      throw codesError
    }

    // Get referral conversions
    const { data: conversions, error: conversionsError } = await supabase
      .from('referral_conversions')
      .select(`
        id,
        signed_up_at,
        converted_at,
        credited,
        referee:referee_id (
          name,
          email,
          subscription_status,
          trial_ends_at
        )
      `)
      .eq('referrer_id', userId)
      .order('signed_up_at', { ascending: false })

    if (conversionsError) {
      throw conversionsError
    }

    // Get user's subscription credits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_credits, codes_generated_this_period, last_code_generation')
      .eq('id', userId)
      .single()

    if (userError) {
      throw userError
    }

    // Calculate stats
    const totalSignups = conversions?.length || 0
    const activeTrials = conversions?.filter(c => 
      c.referee?.subscription_status === 'trial' && 
      !c.converted_at
    ).length || 0
    const paidConversions = conversions?.filter(c => c.converted_at).length || 0
    const monthsEarned = userData?.subscription_credits || 0

    // Calculate if user can generate more codes
    const lastGen = userData?.last_code_generation ? new Date(userData.last_code_generation) : null
    const now = new Date()
    const daysSinceLastGen = lastGen ? (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60 * 24) : 999
    
    let currentCount = userData?.codes_generated_this_period || 0
    if (daysSinceLastGen >= 30) {
      currentCount = 0
    }

    const canGenerateMore = currentCount < 5
    const codesRemaining = Math.max(0, 5 - currentCount)
    const daysUntilReset = daysSinceLastGen < 30 ? Math.ceil(30 - daysSinceLastGen) : 0

    // Format referrals list (name + status only)
    const referrals = conversions?.map(c => ({
      name: c.referee?.name || 'Anonymous',
      status: c.converted_at 
        ? 'paid' 
        : c.referee?.subscription_status === 'trial' 
          ? 'trial' 
          : 'inactive',
      signedUpAt: c.signed_up_at,
      convertedAt: c.converted_at,
      trialEndsAt: c.referee?.trial_ends_at
    })) || []

    return NextResponse.json({
      codes: codes || [],
      stats: {
        totalSignups,
        activeTrials,
        paidConversions,
        monthsEarned
      },
      referrals,
      generation: {
        canGenerateMore,
        codesRemaining,
        daysUntilReset,
        currentPeriodCount: currentCount
      }
    })

  } catch (error) {
    console.error('Fetch referral stats error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch stats' 
    }, { status: 500 })
  }
}
