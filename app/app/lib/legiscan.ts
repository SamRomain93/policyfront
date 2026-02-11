// LegiScan API Client
// Docs: https://api.legiscan.com/dl/LegiScan_API_User_Manual.pdf

const API_BASE = 'https://api.legiscan.com/'

function getApiKey(): string {
  const key = process.env.LEGISCAN_API_KEY
  if (!key) throw new Error('LEGISCAN_API_KEY not configured')
  return key
}

// Status codes from LegiScan API
export const BILL_STATUS: Record<number, string> = {
  0: 'N/A',
  1: 'Introduced',
  2: 'Engrossed',
  3: 'Enrolled',
  4: 'Passed',
  5: 'Vetoed',
  6: 'Failed',
  7: 'Override',
  8: 'Chaptered',
  9: 'Refer',
  10: 'Report Pass',
  11: 'Report DNP',
  12: 'Draft',
}

export const BILL_STATUS_COLOR: Record<number, string> = {
  0: 'gray',
  1: 'blue',
  2: 'yellow',
  3: 'orange',
  4: 'green',
  5: 'red',
  6: 'red',
  7: 'green',
  8: 'green',
  9: 'purple',
  10: 'green',
  11: 'red',
  12: 'gray',
}

export type LegiScanBill = {
  bill_id: number
  change_hash: string
  session_id: number
  session: {
    session_id: number
    state_id: number
    year_start: number
    year_end: number
    session_name: string
  }
  url: string
  state_link: string
  status: number
  status_date: string
  progress: Array<{ date: string; event: number }>
  state: string
  bill_number: string
  bill_type: string
  body: string
  current_body: string
  title: string
  description: string
  committee?: {
    committee_id: number
    chamber: string
    name: string
  }
  history: Array<{
    date: string
    action: string
    chamber: string
    importance: number
  }>
  sponsors: Array<{
    people_id: number
    party: string
    role: string
    name: string
    district: string
    sponsor_type_id: number
    sponsor_order: number
  }>
  subjects: Array<{
    subject_id: number
    subject_name: string
  }>
  texts: Array<{
    doc_id: number
    date: string
    type: string
  }>
}

export type SearchResult = {
  relevance: number
  state: string
  bill_number: string
  bill_id: number
  change_hash: string
  url: string
  last_action_date: string
  last_action: string
  title: string
}

async function apiCall(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(API_BASE)
  url.searchParams.set('key', getApiKey())
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    cache: 'no-store', // Always fresh for API routes
  })

  if (!res.ok) {
    throw new Error(`LegiScan API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (data.status === 'ERROR') {
    throw new Error(`LegiScan: ${data.alert?.message || 'Unknown error'}`)
  }

  return data
}

// Get bill details by LegiScan bill_id
export async function getBill(billId: number): Promise<LegiScanBill> {
  const data = await apiCall({ op: 'getBill', id: String(billId) })
  return data.bill as LegiScanBill
}

// Search for bills by keyword, state, and year
export async function searchBills(
  query: string,
  state?: string,
  year?: number
): Promise<{ results: SearchResult[]; total: number }> {
  const params: Record<string, string> = {
    op: 'getSearch',
    query,
  }
  if (state) params.state = state
  if (year) params.year = String(year)

  const data = await apiCall(params)
  const searchresult = data.searchresult as Record<string, unknown>
  const summary = searchresult.summary as { count: number }

  const results: SearchResult[] = []
  for (const [key, val] of Object.entries(searchresult)) {
    if (key === 'summary') continue
    if (typeof val === 'object' && val !== null && 'bill_id' in val) {
      results.push(val as SearchResult)
    }
  }

  return { results, total: summary?.count || results.length }
}

// Get current session for a state
export async function getSessionList(state?: string): Promise<Array<{
  session_id: number
  state_id: number
  year_start: number
  year_end: number
  session_name: string
  session_tag: string
}>> {
  const params: Record<string, string> = { op: 'getSessionList' }
  if (state) params.state = state
  const data = await apiCall(params)
  return data.sessions as Array<{
    session_id: number
    state_id: number
    year_start: number
    year_end: number
    session_name: string
    session_tag: string
  }>
}

// Get master bill list for a session (for change detection)
export async function getMasterList(sessionIdOrState: string | number): Promise<Record<string, {
  bill_id: number
  number: string
  change_hash: string
  url: string
  status: number
  status_date: string
  last_action_date: string
  last_action: string
  title: string
}>> {
  const params: Record<string, string> = { op: 'getMasterList' }
  if (typeof sessionIdOrState === 'number') {
    params.id = String(sessionIdOrState)
  } else {
    params.state = sessionIdOrState
  }
  const data = await apiCall(params)
  const masterlist = data.masterlist as Record<string, unknown>
  // Remove session metadata, keep bill entries
  const bills: Record<string, {
    bill_id: number; number: string; change_hash: string; url: string;
    status: number; status_date: string; last_action_date: string; last_action: string; title: string
  }> = {}
  for (const [key, val] of Object.entries(masterlist)) {
    if (key === 'session') continue
    if (typeof val === 'object' && val !== null && 'bill_id' in val) {
      bills[key] = val as typeof bills[string]
    }
  }
  return bills
}

// Search by bill number in a state (convenience wrapper)
// Handles variations: HB1145 vs H1145, SB0968 vs S0968, AB-1290, etc.
export async function findBillByNumber(
  billNumber: string,
  state: string
): Promise<SearchResult | null> {
  // Normalize: "AB-1290" -> "AB 1290", "SB846" -> "SB 846"
  const normalized = billNumber
    .replace(/-/g, ' ')
    .replace(/([A-Za-z]+)(\d)/, '$1 $2')
    .trim()

  // Generate search variations
  // Some states use HB/SB, LegiScan might use H/S (e.g., FL: HB1145 -> H1145)
  const variations: string[] = [normalized]
  const match = normalized.match(/^([A-Za-z]+)\s*(\d+)$/)
  if (match) {
    const prefix = match[1].toUpperCase()
    const num = match[2]
    // Try without the "B" suffix: HB -> H, SB -> S
    if (prefix.endsWith('B') && prefix.length > 1) {
      variations.push(`${prefix.slice(0, -1)} ${num}`)
      variations.push(`${prefix.slice(0, -1)}${num}`)
    }
    // Try with leading zeros stripped and added
    variations.push(`${prefix} ${num.replace(/^0+/, '')}`)
    variations.push(`${prefix}${num}`)
    variations.push(`${prefix}0${num}`)
  }

  // Try each variation
  for (const variant of variations) {
    const { results } = await searchBills(variant, state, 2)
    if (results.length === 0) continue

    // Normalize for comparison: strip all non-alphanumeric, lowercase
    const inputNorm = billNumber.replace(/[-\s]+/g, '').toLowerCase()
    const inputNormNoB = inputNorm.replace(/^(h|s)b/, '$1') // HB -> H, SB -> S

    const exact = results.find(r => {
      const rNorm = r.bill_number.replace(/[-\s]+/g, '').toLowerCase()
      return rNorm === inputNorm || rNorm === inputNormNoB
    })

    if (exact) return exact
    // If no exact match but we got results, return the first one from this variant
    return results[0]
  }

  return null
}
