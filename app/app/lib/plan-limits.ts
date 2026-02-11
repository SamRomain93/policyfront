export type PlanName = 'free' | 'solo' | 'professional' | 'agency'

export interface PlanLimits {
  topics: number
  mentions: number
  journalists: boolean
  export: boolean
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: { topics: 1, mentions: 10, journalists: false, export: false },
  solo: { topics: 3, mentions: 50, journalists: false, export: false },
  professional: { topics: 10, mentions: -1, journalists: true, export: true },
  agency: { topics: -1, mentions: -1, journalists: true, export: true },
}

/**
 * Check if a user can use more of a resource.
 * Returns true if under limit, false if at/over limit.
 * A limit of -1 means unlimited.
 */
export function checkLimit(plan: string, resource: keyof PlanLimits, current: number): boolean {
  const planKey = (plan || 'free') as PlanName
  const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free
  const limit = limits[resource]

  if (typeof limit === 'boolean') return limit
  if (limit === -1) return true
  return current < limit
}

/**
 * Get the display label for a limit value.
 * -1 becomes "Unlimited", booleans become checkmark/x.
 */
export function formatLimit(value: number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included'
  if (value === -1) return 'Unlimited'
  return String(value)
}

export const PLAN_DISPLAY: Record<PlanName, { label: string; price: number; color: string; description: string }> = {
  free: { label: 'Free', price: 0, color: 'gray', description: 'Get started with basic tracking' },
  solo: { label: 'Solo', price: 49, color: 'blue', description: 'For individual PA professionals' },
  professional: { label: 'Professional', price: 149, color: 'purple', description: 'For teams managing multiple issues' },
  agency: { label: 'Agency', price: 499, color: 'emerald', description: 'For firms and consultancies' },
}
