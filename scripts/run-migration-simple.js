#!/usr/bin/env node

/**
 * Simple migration runner using Supabase client
 * Executes migration SQL statements one by one
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load env from backend/.env if it exists
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('📡 Connecting to Supabase...')
console.log(`URL: ${SUPABASE_URL}`)
console.log(`Key: ${SUPABASE_KEY ? '***' + SUPABASE_KEY.slice(-4) : 'NOT SET'}`)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql })
    
    if (error) {
      throw error
    }
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function runMigration() {
  console.log('🚀 Starting scan status migration...\n')

  const migrationPath = path.join(__dirname, '../db/migration-scan-status.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('📄 Migration file loaded')
  console.log(`📊 Executing SQL...\n`)

  // Try to execute the entire SQL at once
  const result = await executeSql(sql)
  
  if (result.success) {
    console.log('✅ Migration executed successfully!')
  } else {
    console.error('❌ Migration failed:', result.error)
    console.log('\n⚠️  Trying manual approach via Supabase SQL Editor:')
    console.log('1. Go to: https://supabase.com/dashboard/project/girenjxxtxakvtgvgwtv')
    console.log('2. SQL Editor → New Query')
    console.log('3. Paste the contents of db/migration-scan-status.sql')
    console.log('4. Run it')
    process.exit(1)
  }

  console.log('\n📋 Next steps:')
  console.log('  1. Verify tables created with: SELECT * FROM scan_status LIMIT 1;')
  console.log('  2. Check topics columns with: SELECT last_scan_at FROM topics LIMIT 1;')
  console.log('  3. Test API endpoint at /api/scan-status')
}

runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
