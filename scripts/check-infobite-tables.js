const { createClient } = require('@supabase/supabase-js');

// Hardcode the values from .env.local
const supabaseUrl = 'https://nkqehqwbxkxrgecmgzuq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcWVocXdieGt4cmdlY21nenVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk5NjE4MCwiZXhwIjoyMDY3NTcyMTgwfQ.bWXToInycb2-1gEFKROXNnmYmu_m5GMAb3LPZzgUuRw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Checking InfoBite tables...\n');
  
  // Check learner_events table
  try {
    const { data, error } = await supabase
      .from('learner_events')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ learner_events table does NOT exist');
      console.log('   Error:', error.message);
    } else {
      console.log('✅ learner_events table exists');
    }
  } catch (e) {
    console.log('❌ Error checking learner_events:', e.message);
  }
  
  // Check user_hint_cooldowns table
  try {
    const { data, error } = await supabase
      .from('user_hint_cooldowns')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ user_hint_cooldowns table does NOT exist');
      console.log('   Error:', error.message);
    } else {
      console.log('✅ user_hint_cooldowns table exists');
    }
  } catch (e) {
    console.log('❌ Error checking user_hint_cooldowns:', e.message);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. If tables don\'t exist, go to: https://supabase.com/dashboard/project/nkqehqwbxkxrgecmgzuq/sql/new');
  console.log('2. Copy the SQL from: supabase/migrations/006_add_infobite_agent.sql');
  console.log('3. Run it in the SQL editor');
  console.log('4. Then deploy the edge function');
}

checkTables();