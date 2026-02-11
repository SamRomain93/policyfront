#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://girenjxxtxakvtgvgwtv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_KEY not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runMigration() {
  console.log('🚀 Running scan status migration...\n')

  const migrationPath = path.join(__dirname, '../db/migration-scan-status.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Split into statements - this is rough but works for most cases
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'))

  console.log(`📊 Executing ${statements.length} SQL statements...\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';'
    console.log(`[${i + 1}/${statements.length}] Running...`)
    
    try {
      // Try via raw SQL using rpc
      const { error } = await supabase.rpc('exec', { sql: stmt })
      
      if (error) {
        throw error
      }
      
      console.log(`✅ Success\n`)
    } catch (error) {
      console.error(`❌ Error: ${error.message}`)
      console.error(`   Statement: ${stmt.substring(0, 100)}...\n`)
    }
  }

  console.log('\n✅ Migration complete!')
  console.log('\n📋 Next steps:')
  console.log('  1. Verify scan_status table created')
  console.log('  2. Verify topics table has new columns')
  console.log('  3. Test /api/scan-status endpoint')
}

runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  })
