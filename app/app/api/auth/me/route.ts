import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    // Get current user from session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError) {
      console.error('User fetch error:', userError)
      return NextResponse.json({ 
        error: 'Failed to fetch user data' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      user: {
        ...authUser,
        ...userData
      }
    })

  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch user' 
    }, { status: 500 })
  }
}
