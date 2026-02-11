'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '../components/AuthGuard'
import { PLAN_LIMITS, PLAN_DISPLAY, formatLimit } from '@/app/lib/plan-limits'
import type { PlanName } from '@/app/lib/plan-limits'

type UserPlanInfo = {
  plan: PlanName
  plan_status: string
  stripe_customer_id: string | null
}

type UsageStats = {
  topics: number
  mentions: number
}

const PLAN_BADGE_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  solo: 'bg-blue-50 text-blue-700',
  professional: 'bg-purple-50 text-purple-700',
  agency: 'bg-emerald-50 text-emerald-700',
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700' },
  trialing: { label: 'Trial', color: 'bg-blue-50 text-blue-700' },
  past_due: { label: 'Past Due', color: 'bg-red-50 text-red-700' },
  canceled: { label: 'Canceled', color: 'bg-gray-100 text-gray-600' },
}

const TIER_ORDER: PlanName[] = ['solo', 'professional', 'agency']

const TIER_FEATURES: Record<string, string[]> = {
  solo: ['3 topics tracked', '50 mentions per month', 'Basic alerts', 'Email digest'],
  professional: ['10 topics tracked', 'Unlimited mentions', 'Journalist CRM', 'Export reports', 'Priority support'],
  agency: ['Unlimited topics', 'Unlimited mentions', 'Full CRM access', 'API access', 'Priority support'],
}

export default function BillingPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [planInfo, setPlanInfo] = useState<UserPlanInfo>({
    plan: 'free',
    plan_status: 'active',
    stripe_customer_id: null,
  })
  const [usage, setUsage] = useState<UsageStats>({ topics: 0, mentions: 0 })
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const fetchPlanInfo = useCallback(async () => {
    if (!user) return
    try {
      // Fetch user plan info
      const res = await fetch(`/api/admin/users?id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        const u = Array.isArray(data) ? data[0] : data
        if (u) {
          setPlanInfo({
            plan: u.plan || 'free',
            plan_status: u.plan_status || 'active',
            stripe_customer_id: u.stripe_customer_id || null,
          })
        }
      }

      // Fetch usage stats
      const [topicsRes, mentionsRes] = await Promise.all([
        fetch(`/api/topics?user_id=${user.id}`),
        fetch(`/api/mentions?user_id=${user.id}&count_only=true`),
      ])

      if (topicsRes.ok) {
        const topics = await topicsRes.json()
        setUsage(prev => ({ ...prev, topics: Array.isArray(topics) ? topics.length : 0 }))
      }
      if (mentionsRes.ok) {
        const mentionsData = await mentionsRes.json()
        setUsage(prev => ({
          ...prev,
          mentions: typeof mentionsData.count === 'number' ? mentionsData.count : (Array.isArray(mentionsData) ? mentionsData.length : 0),
        }))
      }
    } catch (err) {
      console.error('Failed to load billing info:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPlanInfo()
  }, [fetchPlanInfo])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showToast('Subscription activated! Welcome aboard.')
      // Refresh plan info after successful checkout
      setTimeout(() => fetchPlanInfo(), 1500)
    } else if (searchParams.get('canceled') === 'true') {
      showToast('Checkout canceled. No changes were made.')
    }
  }, [searchParams, fetchPlanInfo])

  const handleUpgrade = async (plan: string) => {
    if (!user) return
    setUpgrading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, user_id: user.id }),
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        showToast(data.error || 'Failed to start checkout')
      }
    } catch {
      showToast('Something went wrong. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!user) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        showToast(data.error || 'Failed to open billing portal')
      }
    } catch {
      showToast('Something went wrong. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const currentLimits = PLAN_LIMITS[planInfo.plan] || PLAN_LIMITS.free

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-near-black text-cream-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl mb-1">Billing</h1>
        <p className="text-sm text-muted">Manage your subscription and view usage.</p>
      </div>

      {/* Current Plan Card */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-[family-name:var(--font-serif)] text-lg">Current Plan</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_BADGE_COLORS[planInfo.plan] || PLAN_BADGE_COLORS.free}`}>
                {PLAN_DISPLAY[planInfo.plan]?.label || 'Free'}
              </span>
              {planInfo.plan !== 'free' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[planInfo.plan_status]?.color || STATUS_BADGES.active.color}`}>
                  {STATUS_BADGES[planInfo.plan_status]?.label || 'Active'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              {planInfo.plan === 'free'
                ? 'You are on the free tier. Upgrade to unlock more features.'
                : `You are on the ${PLAN_DISPLAY[planInfo.plan]?.label} plan.`}
            </p>
          </div>

          {planInfo.stripe_customer_id && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="px-4 py-2 rounded-full text-sm font-medium border border-border hover:bg-cream-100 transition flex items-center gap-2"
            >
              {portalLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              )}
              Manage Subscription
            </button>
          )}
        </div>

        {/* Usage Stats */}
        {planInfo.plan !== 'free' && (
          <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border">
            {/* Topics Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Topics</span>
                <span className="text-xs text-muted">
                  {usage.topics} / {formatLimit(currentLimits.topics)}
                </span>
              </div>
              {currentLimits.topics !== -1 ? (
                <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min((usage.topics / currentLimits.topics) * 100, 100)}%` }}
                  />
                </div>
              ) : (
                <div className="w-full h-2 bg-emerald-100 rounded-full">
                  <div className="h-full bg-emerald-400 rounded-full w-full opacity-30" />
                </div>
              )}
            </div>

            {/* Mentions Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Mentions This Month</span>
                <span className="text-xs text-muted">
                  {usage.mentions} / {formatLimit(currentLimits.mentions)}
                </span>
              </div>
              {currentLimits.mentions !== -1 ? (
                <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min((usage.mentions / currentLimits.mentions) * 100, 100)}%` }}
                  />
                </div>
              ) : (
                <div className="w-full h-2 bg-emerald-100 rounded-full">
                  <div className="h-full bg-emerald-400 rounded-full w-full opacity-30" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pricing Tiers */}
      <div className="mb-4">
        <h2 className="font-[family-name:var(--font-serif)] text-lg">
          {planInfo.plan === 'free' ? 'Choose a Plan' : 'Available Plans'}
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TIER_ORDER.map((tier) => {
          const display = PLAN_DISPLAY[tier]
          const limits = PLAN_LIMITS[tier]
          const isCurrentPlan = planInfo.plan === tier
          const isProfessional = tier === 'professional'
          const features = TIER_FEATURES[tier]

          return (
            <div
              key={tier}
              className={`glass-card p-8 flex flex-col relative ${
                isCurrentPlan
                  ? 'ring-2 ring-accent'
                  : isProfessional
                  ? 'ring-2 ring-near-black'
                  : ''
              }`}
            >
              {/* Badges */}
              {isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide uppercase ${PLAN_BADGE_COLORS[tier]} border`}>
                    Current Plan
                  </span>
                </div>
              )}
              {isProfessional && !isCurrentPlan && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-near-black text-cream-50 text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide uppercase">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="font-[family-name:var(--font-serif)] text-2xl mb-2">{display.label}</h3>
                <p className="text-sm text-muted">{display.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold tracking-tight">${display.price}</span>
                <span className="text-muted ml-1">/mo</span>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-[15px]">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
                {limits.journalists && (
                  <li className="flex items-center gap-3 text-[15px]">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Journalist CRM</span>
                  </li>
                )}
                {limits.export && (
                  <li className="flex items-center gap-3 text-[15px]">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Export reports</span>
                  </li>
                )}
              </ul>

              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full py-3 rounded-full text-sm font-medium border border-border bg-cream-100 text-muted cursor-default"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={upgrading === tier}
                  className="w-full bg-near-black text-cream-50 py-3 rounded-full text-sm font-medium hover:bg-near-black/85 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {upgrading === tier ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    planInfo.plan === 'free' ? 'Get Started' : 'Switch Plan'
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Free tier note */}
      <div className="mt-6 text-center">
        <p className="text-sm text-light-muted">
          All plans include a 14-day free trial. Cancel anytime from the billing portal.
        </p>
      </div>
    </div>
  )
}
