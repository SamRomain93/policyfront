import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const scanType = searchParams.get('type') || 'mentions'

    // Get latest scan status
    const { data: latestScan, error: scanError } = await supabase
      .rpc('get_latest_scan_status', { p_scan_type: scanType })
      .single() as {
        data: {
          scan_type: string
          started_at: string
          completed_at: string | null
          status: string
          topics_scanned: number
          mentions_found: number
          duration_seconds: number
        } | null
        error: any
      }

    if (scanError && scanError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Scan status error:', scanError)
    }

    // Get per-topic scan status
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name, last_scan_at, last_scan_status, next_scan_at')
      .eq('active', true)
      .order('last_scan_at', { ascending: false, nullsFirst: false })

    if (topicsError) {
      throw topicsError
    }

    // Calculate status
    const now = new Date()
    const hasActiveScan = latestScan?.status === 'running'
    
    let globalStatus: 'active' | 'idle' | 'failed' = 'idle'
    let statusMessage = 'Ready to scan'
    
    if (hasActiveScan) {
      globalStatus = 'active'
      statusMessage = 'Scanning now...'
    } else if (latestScan?.status === 'failed') {
      globalStatus = 'failed'
      statusMessage = 'Last scan failed'
    } else if (latestScan?.completed_at) {
      const lastScanTime = new Date(latestScan.completed_at)
      const minutesAgo = Math.floor((now.getTime() - lastScanTime.getTime()) / 1000 / 60)
      
      if (minutesAgo < 60) {
        statusMessage = `Last scan: ${minutesAgo}m ago`
      } else if (minutesAgo < 1440) {
        const hoursAgo = Math.floor(minutesAgo / 60)
        statusMessage = `Last scan: ${hoursAgo}h ago`
      } else {
        const daysAgo = Math.floor(minutesAgo / 1440)
        statusMessage = `Last scan: ${daysAgo}d ago`
      }
      
      globalStatus = 'idle'
    }

    return NextResponse.json({
      status: globalStatus,
      message: statusMessage,
      lastScan: latestScan ? {
        startedAt: latestScan.started_at,
        completedAt: latestScan.completed_at,
        status: latestScan.status,
        topicsScanned: latestScan.topics_scanned,
        mentionsFound: latestScan.mentions_found,
        durationSeconds: latestScan.duration_seconds
      } : null,
      topics: topics?.map(t => ({
        id: t.id,
        name: t.name,
        lastScanAt: t.last_scan_at,
        status: t.last_scan_status || 'pending',
        nextScanAt: t.next_scan_at
      })) || []
    })

  } catch (error) {
    console.error('Fetch scan status error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch scan status' 
    }, { status: 500 })
  }
}
