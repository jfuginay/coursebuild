const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running skip tracking migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '007_add_skip_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n📋 MANUAL SETUP REQUIRED:');
    console.log('===============================================');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/nkqehqwbxkxrgecmgzuq/sql/new');
    console.log('\n' + migrationSQL);
    console.log('\n===============================================');
    console.log('After running the SQL, skipped questions will be properly tracked!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

runMigration();