import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/app/lib/stripe'
import { getSupabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add your Stripe keys.' },
        { status: 503 }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user_id)
      .single()

    if (userError || !user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 404 }
      )
    }

    const origin = req.headers.get('origin') || 'https://policyfront.vercel.app'

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
