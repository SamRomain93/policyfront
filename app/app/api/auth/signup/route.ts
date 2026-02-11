import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const { 
      email, 
      password, 
      name, 
      phone, 
      company, 
      address,
      referred_by_code,
      trial_ends_at,
      subscription_status,
      tier 
    } = body

    // Validate required fields
    if (!email || !password || !name || !phone) {
      return NextResponse.json({ 
        error: 'Email, password, name, and phone are required' 
      }, { status: 400 })
    }

    // Compute trial_ends_at server-side if referred (never trust client)
    const serverTrialEnd = referred_by_code
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null
    const serverSubStatus = referred_by_code ? 'trial' : null

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    if (authError) {
      return NextResponse.json({ 
        error: authError.message 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ 
        error: 'Failed to create user' 
      }, { status: 500 })
    }

    // Create user record in database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        phone,
        company: company || null,
        address: address || null,
        referred_by_code: referred_by_code || null,
        trial_ends_at: serverTrialEnd,
        subscription_status: serverSubStatus,
        tier: tier || 'solo',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('User record creation error:', userError)
      // Don't fail if user record fails, auth user is created
      // They can still login and we can create the record later
    }

    return NextResponse.json({ 
      success: true,
      userId: authData.user.id,
      user: userData
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ 
      error: 'Failed to create account' 
    }, { status: 500 })
  }
}
