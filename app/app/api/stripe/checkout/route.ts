import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PLAN_PRICE_MAP } from '@/app/lib/stripe'
import { getSupabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { plan, user_id } = await req.json()

    if (!plan || !user_id) {
      return NextResponse.json({ error: 'Missing plan or user_id' }, { status: 400 })
    }

    const priceId = PLAN_PRICE_MAP[plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
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

    // Look up the user to get their email and existing stripe_customer_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let customerId = user.stripe_customer_id

    // Create a Stripe customer if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id },
      })
      customerId = customer.id

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user_id)
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'https://policyfront.vercel.app'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      metadata: { user_id, plan },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
