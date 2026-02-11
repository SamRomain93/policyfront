import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === 'sk_test_placeholder') return null

  _stripe = new Stripe(key)
  return _stripe
}

/**
 * Map plan names to Stripe price IDs.
 * These will be replaced with real Stripe price IDs once configured.
 */
export const PLAN_PRICE_MAP: Record<string, string> = {
  solo: 'price_solo_placeholder',
  professional: 'price_professional_placeholder',
  agency: 'price_agency_placeholder',
}
