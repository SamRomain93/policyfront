import { getSupabase } from './supabase'

// Get the current user from the Supabase auth token in cookies/headers
// For server-side API routes
export async function getServerUser(request: Request) {
  const supabase = getSupabase()
  if (!supabase) return null

  // Check for Bearer token in Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) return user
  }

  // Check for sb-access-token cookie
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )

  const accessToken = cookies['sb-girenjxxtxakvtgvgwtv-auth-token']
  if (accessToken) {
    try {
      const parsed = JSON.parse(decodeURIComponent(accessToken))
      const token = parsed?.[0] || parsed?.access_token
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!error && user) return user
      }
    } catch {
      // Not valid JSON, try as raw token
    }
  }

  return null
}
