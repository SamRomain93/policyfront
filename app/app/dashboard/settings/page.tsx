'use client'

import { useState, useEffect } from 'react'
import BillingPage from '../billing/page'
import { useRouter } from 'next/navigation'

interface ReferralStats {
  codes: Array<{
    id: string
    code: string
    uses_count: number
    created_at: string
  }>
  stats: {
    totalSignups: number
    activeTrials: number
    paidConversions: number
    monthsEarned: number
  }
  referrals: Array<{
    name: string
    status: 'trial' | 'paid' | 'inactive'
    signedUpAt: string
    convertedAt?: string
    trialEndsAt?: string
  }>
  generation: {
    canGenerateMore: boolean
    codesRemaining: number
    daysUntilReset: number
  }
}


const emptyReferralStats: ReferralStats = {
  codes: [],
  stats: { totalSignups: 0, activeTrials: 0, paidConversions: 0, monthsEarned: 0 },
  referrals: [],
  generation: { canGenerateMore: true, codesRemaining: 5, daysUntilReset: 0 }
}

export default function Settings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'referrals'>('profile')

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  })

  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.user) {
        setUserData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          company: data.user.company || ''
        })

        // Load referral stats with the same user ID
        if (data.user.id) {
          const statsRes = await fetch(`/api/referrals/stats?userId=${data.user.id}`)
          if (statsRes.ok) {
            const stats = await statsRes.json()
            setReferralStats(stats)
          } else {
            setReferralStats(emptyReferralStats)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err)
      setReferralStats(emptyReferralStats)
    } finally {
      setLoading(false)
    }
  }

  const loadReferralStats = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.user?.id) {
        const statsRes = await fetch(`/api/referrals/stats?userId=${data.user.id}`)
        if (statsRes.ok) {
          const stats = await statsRes.json()
          setReferralStats(stats)
        } else {
          setReferralStats(emptyReferralStats)
        }
      }
    } catch (err) {
      console.error('Failed to load referral stats:', err)
      setReferralStats(emptyReferralStats)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      if (res.ok) {
        alert('Settings saved successfully')
      } else {
        alert('Failed to save settings')
      }
    } catch (err) {
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const generateReferralCode = async () => {
    setGeneratingCode(true)
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      
      if (data.user?.id) {
        const codeRes = await fetch('/api/referrals/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id })
        })

        const codeData = await codeRes.json()

        if (codeRes.ok) {
          await loadReferralStats()
        } else {
          alert(codeData.error || 'Failed to generate code')
        }
      }
    } catch (err) {
      alert('Failed to generate code')
    } finally {
      setGeneratingCode(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const getShareableLink = (code: string) => {
    return `${window.location.origin}/signup-referral?code=${code}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'profile', label: 'Profile' },
            { key: 'billing', label: 'Billing' },
            { key: 'referrals', label: 'Referrals' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
            <input
              type="tel"
              value={userData.phone}
              onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
            <input
              type="text"
              value={userData.company}
              onChange={(e) => setUserData({ ...userData, company: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              value={userData.address}
              onChange={(e) => setUserData({ ...userData, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="We send gifts to our top users!"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <BillingPage />
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && referralStats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Total Signups</div>
              <div className="text-3xl font-bold text-gray-900">{referralStats.stats.totalSignups}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Active Trials</div>
              <div className="text-3xl font-bold text-yellow-600">{referralStats.stats.activeTrials}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Paid Conversions</div>
              <div className="text-3xl font-bold text-green-600">{referralStats.stats.paidConversions}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Months Earned</div>
              <div className="text-3xl font-bold text-indigo-600">{referralStats.stats.monthsEarned}</div>
            </div>
          </div>

          {/* Referral Codes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Your Referral Codes</h2>
              <button
                onClick={generateReferralCode}
                disabled={generatingCode || !referralStats.generation.canGenerateMore}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                {generatingCode ? 'Generating...' : 'Generate New Code'}
              </button>
            </div>

            {!referralStats.generation.canGenerateMore && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
                You've generated 5 codes this period. You can generate more in{' '}
                {referralStats.generation.daysUntilReset} days.
              </div>
            )}

            <div className="text-sm text-gray-600 mb-4">
              Codes remaining this period: {referralStats.generation.codesRemaining}/5
            </div>

            <div className="space-y-3">
              {referralStats.codes.map(code => (
                <div key={code.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-mono text-lg font-bold text-gray-900">{code.code}</div>
                    <div className="text-sm text-gray-600">{code.uses_count} signups</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(code.code)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Copy Code
                    </button>
                    <button
                      onClick={() => copyToClipboard(getShareableLink(code.code))}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Referrals List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Referrals</h2>
            
            {referralStats.referrals.length === 0 ? (
              <p className="text-gray-600">No referrals yet. Share your codes to get started!</p>
            ) : (
              <div className="space-y-3">
                {referralStats.referrals.map((referral, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{referral.name}</div>
                      <div className="text-sm text-gray-600">
                        Signed up {new Date(referral.signedUpAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        referral.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : referral.status === 'trial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {referral.status === 'paid' ? '✓ Paid' : referral.status === 'trial' ? 'Trial' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
