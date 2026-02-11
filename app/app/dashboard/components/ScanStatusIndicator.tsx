'use client'

import { useState, useEffect } from 'react'

interface ScanStatus {
  status: 'active' | 'idle' | 'failed'
  message: string
  lastScan?: {
    startedAt: string
    completedAt: string | null
    status: string
    topicsScanned: number
    mentionsFound: number
    durationSeconds: number
  } | null
}

export default function ScanStatusIndicator({ 
  variant = 'default' 
}: { 
  variant?: 'default' | 'compact' 
}) {
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/scan-status')
      const data = await res.json()
      setScanStatus(data)
    } catch (error) {
      console.error('Failed to fetch scan status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (loading || !scanStatus) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
        <span>Loading...</span>
      </div>
    )
  }

  const statusColors = {
    active: 'bg-yellow-500',
    idle: 'bg-green-500',
    failed: 'bg-red-500'
  }

  const statusDot = statusColors[scanStatus.status]

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className={`w-2 h-2 rounded-full ${statusDot} ${scanStatus.status === 'active' ? 'animate-pulse' : ''}`} />
        <span>{scanStatus.message}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className={`w-3 h-3 rounded-full ${statusDot} ${scanStatus.status === 'active' ? 'animate-pulse' : ''}`} />
      
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">
          {scanStatus.status === 'active' && '🔄 Scanning now...'}
          {scanStatus.status === 'idle' && '✅ System active'}
          {scanStatus.status === 'failed' && '❌ Last scan failed'}
        </div>
        <div className="text-xs text-gray-600">
          {scanStatus.message}
        </div>
      </div>

      {scanStatus.lastScan && scanStatus.status === 'idle' && (
        <div className="text-right">
          <div className="text-xs text-gray-500">
            {scanStatus.lastScan.topicsScanned} topics
          </div>
          <div className="text-xs text-gray-500">
            {scanStatus.lastScan.mentionsFound} mentions
          </div>
        </div>
      )}
    </div>
  )
}
