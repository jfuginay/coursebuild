const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Hardcode the values from .env.local
const supabaseUrl = 'https://nkqehqwbxkxrgecmgzuq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcWVocXdieGt4cmdlY21nenVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk5NjE4MCwiZXhwIjoyMDY3NTcyMTgwfQ.bWXToInycb2-1gEFKROXNnmYmu_m5GMAb3LPZzgUuRw';

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