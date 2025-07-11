const { createClient } = require('@supabase/supabase-js');
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