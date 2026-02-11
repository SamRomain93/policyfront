import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check if user exists and can generate codes
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('last_code_generation, codes_generated_this_period')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check rolling 30-day limit
    const lastGen = userData.last_code_generation ? new Date(userData.last_code_generation) : null
    const now = new Date()
    const daysSinceLastGen = lastGen ? (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60 * 24) : 999

    let currentCount = userData.codes_generated_this_period || 0

    // Reset count if 30+ days have passed
    if (daysSinceLastGen >= 30) {
      currentCount = 0
    }

    // Check if user can generate more codes
    if (currentCount >= 5 && daysSinceLastGen < 30) {
      const daysUntilReset = Math.ceil(30 - daysSinceLastGen)
      return NextResponse.json({ 
        error: `Code generation limit reached. You can generate more codes in ${daysUntilReset} days.`,
        canGenerate: false,
        daysUntilReset 
      }, { status: 429 })
    }

    // Generate unique code
    let newCode = ''
    let isUnique = false
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    
    while (!isUnique) {
      newCode = Array.from({ length: 8 }, () => 
        chars[Math.floor(Math.random() * chars.length)]
      ).join('')

      // Check if code exists
      const { data: existing } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('code', newCode)
        .single()

      if (!existing) {
        isUnique = true
      }
    }

    // Insert the code
    const { error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        user_id: userId,
        code: newCode,
        uses_count: 0
      })

    if (insertError) {
      throw insertError
    }

    // Update user's generation tracking
    const newCount = daysSinceLastGen >= 30 ? 1 : currentCount + 1
    await supabase
      .from('users')
      .update({
        codes_generated_this_period: newCount,
        last_code_generation: now.toISOString()
      })
      .eq('id', userId)

    return NextResponse.json({ 
      code: newCode,
      codesRemaining: 5 - newCount
    })

  } catch (error) {
    console.error('Generate referral code error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate code' 
    }, { status: 500 })
  }
}
