const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Get values from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running table rename migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_rename_question_attempts_to_responses.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Migration SQL loaded from:', migrationPath);
    console.log('📏 SQL length:', migrationSQL.length, 'characters\n');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      console.error('\n💡 Try running this migration manually:');
      console.error('1. Go to: https://supabase.com/dashboard/project/nkqehqwbxkxrgecmgzuq/sql/new');
      console.error('2. Copy the SQL from: supabase/migrations/008_rename_question_attempts_to_responses.sql');
      console.error('3. Run it in the SQL editor');
    } else {
      console.log('✅ Migration completed successfully!');
      
      // Verify the table exists
      console.log('\n🔍 Verifying table rename...');
      const { data: testData, error: testError } = await supabase
        .from('user_question_responses')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('❌ Table verification failed:', testError.message);
      } else {
        console.log('✅ Table user_question_responses is accessible!');
      }
    }
  } catch (e) {
    console.error('❌ Unexpected error:', e.message);
    console.error('\n💡 Try running the migration manually in the Supabase dashboard');
  }
}

runMigration();