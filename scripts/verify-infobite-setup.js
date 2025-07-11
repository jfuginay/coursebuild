const { createClient } = require('@supabase/supabase-js');

// Hardcode the values from .env.local
const supabaseUrl = 'https://nkqehqwbxkxrgecmgzuq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcWVocXdieGt4cmdlY21nenVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTYxODAsImV4cCI6MjA2NzU3MjE4MH0.mOOF0r4u2WFgcEHdvn-3laDCR5IK_8Z49ZSuOVyXDv8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifySetup() {
  console.log('🔍 Verifying InfoBite setup...\n');
  
  let allGood = true;
  
  // Check learner_events table
  try {
    const { data, error } = await supabase
      .from('learner_events')
      .select('count')
      .limit(1);
      
    if (error) {
      console.log('❌ learner_events table - NOT READY');
      console.log('   Error:', error.message);
      allGood = false;
    } else {
      console.log('✅ learner_events table - READY');
    }
  } catch (e) {
    console.log('❌ Error checking learner_events:', e.message);
    allGood = false;
  }
  
  // Check user_hint_cooldowns table
  try {
    const { data, error } = await supabase
      .from('user_hint_cooldowns')
      .select('count')
      .limit(1);
      
    if (error) {
      console.log('❌ user_hint_cooldowns table - NOT READY');
      console.log('   Error:', error.message);
      allGood = false;
    } else {
      console.log('✅ user_hint_cooldowns table - READY');
    }
  } catch (e) {
    console.log('❌ Error checking user_hint_cooldowns:', e.message);
    allGood = false;
  }
  
  // Check edge function
  try {
    console.log('\n🔍 Checking edge function...');
    const response = await fetch(`${supabaseUrl}/functions/v1/inject-insight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000000',
        courseId: '00000000-0000-0000-0000-000000000000',
        currentTime: 0,
        autonomyLevel: 0,
        wrongAnswerStreak: 0
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Edge function - DEPLOYED AND WORKING');
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Edge function - ERROR');
      console.log('   Status:', response.status);
      console.log('   Error:', await response.text());
      allGood = false;
    }
  } catch (e) {
    console.log('❌ Error checking edge function:', e.message);
    allGood = false;
  }
  
  console.log('\n===============================================');
  if (allGood) {
    console.log('🎉 INFOBITE IS READY TO USE!');
    console.log('\nYou can now:');
    console.log('1. Start your Next.js dev server: npm run dev');
    console.log('2. Navigate to a course page');
    console.log('3. Log in as a user');
    console.log('4. The autonomy slider will appear');
    console.log('5. Set it to "Guide Me" mode for maximum hints');
    console.log('6. Answer questions incorrectly to trigger hints!');
  } else {
    console.log('⚠️  SETUP INCOMPLETE');
    console.log('\nPlease:');
    console.log('1. Run the SQL migration in Supabase dashboard');
    console.log('2. Make sure the edge function is deployed');
    console.log('3. Run this script again to verify');
  }
  console.log('===============================================\n');
}

verifySetup();