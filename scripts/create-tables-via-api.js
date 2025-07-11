const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

async function createTablesViaAPI() {
  console.log('🚀 Attempting to create InfoBite tables via Supabase API...\n');
  
  // First, let's check if we can access the database at all
  console.log('🔍 Testing database access...');
  
  try {
    // Try to query an existing table to verify connection
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .limit(1);
    
    if (coursesError) {
      console.log('❌ Cannot access database:', coursesError.message);
      return;
    }
    
    console.log('✅ Database connection verified\n');
    
    // Now let's check if tables already exist by trying to query them
    console.log('🔍 Checking if InfoBite tables already exist...\n');
    
    // Check learner_events
    const { error: eventsError } = await supabase
      .from('learner_events')
      .select('id')
      .limit(1);
    
    if (!eventsError) {
      console.log('✅ learner_events table already exists!');
    } else if (eventsError.message.includes('relation') && eventsError.message.includes('does not exist')) {
      console.log('❌ learner_events table does not exist');
    }
    
    // Check user_hint_cooldowns
    const { error: cooldownsError } = await supabase
      .from('user_hint_cooldowns')
      .select('user_id')
      .limit(1);
    
    if (!cooldownsError) {
      console.log('✅ user_hint_cooldowns table already exists!');
    } else if (cooldownsError.message.includes('relation') && cooldownsError.message.includes('does not exist')) {
      console.log('❌ user_hint_cooldowns table does not exist');
    }
    
    console.log('\n===============================================');
    console.log('📋 MANUAL SETUP REQUIRED');
    console.log('===============================================\n');
    console.log('The tables need to be created via the Supabase Dashboard.\n');
    console.log('Here\'s a simplified SQL script that you can run:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/nkqehqwbxkxrgecmgzuq/sql/new');
    console.log('2. Copy and paste this SQL:\n');
    
    // Print simplified SQL
    console.log(`-- InfoBite Tables (Simplified)
-- Just the essential tables and indexes

-- Create learner_events table
CREATE TABLE learner_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('WATCH', 'QUIZ_WRONG', 'HINT_SHOWN')),
    video_timestamp INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_hint_cooldowns table
CREATE TABLE user_hint_cooldowns (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    last_hint_timestamp TIMESTAMPTZ,
    hint_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, course_id)
);

-- Create indexes
CREATE INDEX idx_learner_events_user_course ON learner_events(user_id, course_id);
CREATE INDEX idx_learner_events_created_at ON learner_events(created_at DESC);

-- Enable RLS
ALTER TABLE learner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hint_cooldowns ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can access own events" ON learner_events 
    USING (auth.uid() = user_id OR auth.role() = 'service_role');
    
CREATE POLICY "Users can access own cooldowns" ON user_hint_cooldowns 
    USING (auth.uid() = user_id OR auth.role() = 'service_role');`);
    
    console.log('\n3. Click "Run" in the SQL editor\n');
    console.log('4. Then run: node scripts/verify-infobite-setup.js\n');
    console.log('===============================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTablesViaAPI();