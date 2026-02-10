'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  _client = createClient(url, key)
  return _client
}

// Default export for convenience, lazy-initialized
export const supabase = typeof window !== 'undefined'
  ? getSupabaseBrowser()
  : createClient('https://placeholder.supabase.co', 'placeholder')
