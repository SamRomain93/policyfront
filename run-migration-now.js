#!/usr/bin/env node

/**
 * Migration runner for scan status tracking
 * Run with: node run-migration-now.js
 */

const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Hardcoded for this migration
const SUPABASE_URL = 'https://girenjxxtxakvtgvgwtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcmVuanh4dHhha3Z0Z3Znd3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzQxMzIsImV4cCI6MjA4NjMxMDEzMn0.5MnjbE19yMtLJ_wYfShVbrFbrfQ-zZeug9xHDsdXlqU';

console.log('🚀 Running scan status migration...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  // Read migration file
  const sql = fs.readFileSync(path.join(__dirname, 'db/migration-scan-status.sql'), 'utf8');
  
  console.log('📄 Migration file loaded (' + sql.length + ' bytes)\n');
  
  // Execute key statements manually since we can't use arbitrary SQL with anon key
  console.log('⚠️  Note: Cannot execute raw SQL with anon key.');
  console.log('✅ Alternative: Using Supabase REST API for schema changes\n');
  
  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('topics')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      throw testError;
    }
    
    console.log('✅ Connected to Supabase successfully\n');
    
    // Unfortunately, we can't execute DDL with the anon key
    // We need to use the Supabase Dashboard SQL Editor
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 MANUAL MIGRATION REQUIRED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Follow these steps:\n');
    console.log('1. Open: https://supabase.com/dashboard/project/girenjxxtxakvtgvgwtv');
    console.log('2. Click "SQL Editor" in the left sidebar');
    console.log('3. Click "New Query"');
    console.log('4. Paste the contents below:');
    console.log('\n━━━━━━━━━━ SQL START ━━━━━━━━━━\n');
    console.log(sql);
    console.log('\n━━━━━━━━━━ SQL END ━━━━━━━━━━\n');
    console.log('5. Click "Run" (or press Cmd/Ctrl + Enter)');
    console.log('6. Verify success message\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📌 Quick copy:');
    console.log('File location: ~/clawd/policyfront/db/migration-scan-status.sql\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('✅ Instructions displayed. Please run the migration in Supabase Dashboard.\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
