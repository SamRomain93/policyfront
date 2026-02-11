import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { name, phone, company, address } = body

    // Update user record
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({
        name,
        phone,
        company: company || null,
        address: address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.id)
      .select()
      .single()

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update user' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      user: userData
    })

  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update user' 
    }, { status: 500 })
  }
}
