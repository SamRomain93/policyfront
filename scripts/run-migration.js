#!/usr/bin/env node

/**
 * Migration Runner for PolicyFront Referral System
 * 
 * This script executes the referral system migration SQL file against the Supabase database.
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable or uses connection string.
 * 
 * Usage:
 *   node scripts/run-migration.js
 *   
 * Or with service role key:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/run-migration.js
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL environment variable not set')
  process.exit(1)
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set')
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting referral system migration...\n')

  // Read migration SQL file
  const migrationPath = path.join(__dirname, '../db/migration-referrals.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')
  console.log(`📄 Loaded migration SQL (${sql.length} bytes)\n`)

  // Split SQL into individual statements (rough split by semicolon)
  // This handles most cases but may need adjustment for complex SQL
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📊 Executing ${statements.length} SQL statements...\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    
    // Skip comments and empty statements
    if (!stmt || stmt.startsWith('--') || stmt.startsWith('COMMENT')) {
      continue
    }

    try {
      console.log(`  [${i + 1}/${statements.length}] Executing...`)
      
      // Execute via RPC or direct SQL depending on statement type
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt })
      
      if (error) {
        throw error
      }

      successCount++
      console.log(`  ✅ Success\n`)
    } catch (error) {
      errorCount++
      console.error(`  ❌ Error: ${error.message}`)
      console.error(`     Statement: ${stmt.substring(0, 100)}...\n`)
      
      // Continue with other statements instead of failing entirely
    }
  }

  console.log('\n📈 Migration Summary:')
  console.log(`  ✅ Successful: ${successCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run them manually via Supabase SQL Editor.')
    console.log('    Supabase Dashboard → SQL Editor → New Query → Paste migration SQL')
  } else {
    console.log('\n🎉 Migration completed successfully!')
  }

  console.log('\n📋 Next steps:')
  console.log('  1. Verify tables created: referral_codes, referral_conversions')
  console.log('  2. Test referral code generation at /dashboard/settings')
  console.log('  3. Test referral signup at /signup-referral')
  console.log('  4. Deploy to Vercel: git push')
}

// Run migration
runMigration().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
