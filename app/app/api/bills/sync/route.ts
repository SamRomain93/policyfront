import { NextResponse } from 'next/server'

// POST /api/bills/sync - Trigger a bill sync (proxies to legiscan/sync with cron secret)
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  const baseUrl = new URL(request.url).origin

  try {
    const res = await fetch(`${baseUrl}/api/legiscan/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
