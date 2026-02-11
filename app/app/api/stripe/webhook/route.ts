import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = (() => {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || key === 'sk_test_placeholder') return null
    return new Stripe(key)
  })()

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan

        if (userId && plan) {
          // Update user subscription
          await supabase
            .from('users')
            .update({
              plan,
              plan_status: 'active',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              trial_ends_at: null
            })
            .eq('id', userId)

          // Apply referral credit if this user was referred
          const { data: conversionData } = await supabase
            .from('referral_conversions')
            .select('id, referrer_id, credited')
            .eq('referee_id', userId)
            .eq('credited', false)
            .single()

          if (conversionData && conversionData.referrer_id) {
            // Get referrer's current subscription end date
            const { data: referrerData } = await supabase
              .from('users')
              .select('subscription_end_at, subscription_credits')
              .eq('id', conversionData.referrer_id)
              .single()

            if (referrerData) {
              const now = new Date()
              const currentEnd = referrerData.subscription_end_at 
                ? new Date(referrerData.subscription_end_at)
                : now
              
              // Add 30 days to subscription
              const newEnd = new Date(
                Math.max(currentEnd.getTime(), now.getTime()) + (30 * 24 * 60 * 60 * 1000)
              )

              // Update referrer with credit
              await supabase
                .from('users')
                .update({
                  subscription_credits: (referrerData.subscription_credits || 0) + 1,
                  subscription_end_at: newEnd.toISOString()
                })
                .eq('id', conversionData.referrer_id)

              // Mark conversion as credited
              await supabase
                .from('referral_conversions')
                .update({
                  converted_at: now.toISOString(),
                  credited: true
                })
                .eq('id', conversionData.id)
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const status = subscription.status === 'active'
          ? 'active'
          : subscription.status === 'trialing'
          ? 'trialing'
          : subscription.status === 'past_due'
          ? 'past_due'
          : 'canceled'

        await supabase
          .from('users')
          .update({ plan_status: status })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('users')
          .update({
            plan: 'free',
            plan_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabase
          .from('users')
          .update({ plan_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        // Unhandled event type
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
