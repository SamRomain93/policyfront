import { NextResponse, NextRequest } from 'next/server'
import { searchBills, getBill, findBillByNumber, BILL_STATUS } from '@/app/lib/legiscan'

// GET /api/legiscan?action=search&query=solar&state=CA
// GET /api/legiscan?action=bill&id=123456
// GET /api/legiscan?action=find&number=AB-1290&state=CA
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')

  if (!process.env.LEGISCAN_API_KEY) {
    return NextResponse.json({ error: 'LegiScan API not configured' }, { status: 503 })
  }

  try {
    switch (action) {
      case 'search': {
        const query = request.nextUrl.searchParams.get('query')
        const state = request.nextUrl.searchParams.get('state') || undefined
        const year = request.nextUrl.searchParams.get('year')
        if (!query) {
          return NextResponse.json({ error: 'query parameter required' }, { status: 400 })
        }
        const data = await searchBills(query, state, year ? parseInt(year) : undefined)
        return NextResponse.json(data)
      }

      case 'bill': {
        const id = request.nextUrl.searchParams.get('id')
        if (!id) {
          return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
        }
        const bill = await getBill(parseInt(id))
        return NextResponse.json({
          ...bill,
          status_text: BILL_STATUS[bill.status] || 'Unknown',
        })
      }

      case 'find': {
        const number = request.nextUrl.searchParams.get('number')
        const state = request.nextUrl.searchParams.get('state')
        if (!number || !state) {
          return NextResponse.json({ error: 'number and state parameters required' }, { status: 400 })
        }
        const result = await findBillByNumber(number, state)
        if (!result) {
          return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
        }
        // Get full details
        const bill = await getBill(result.bill_id)
        return NextResponse.json({
          ...bill,
          status_text: BILL_STATUS[bill.status] || 'Unknown',
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: search, bill, find' },
          { status: 400 }
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
