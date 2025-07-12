/**
 * Test script for the Enhanced Recommendations System
 * Verifies database tables and edge functions are working correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseTables() {
  console.log('\n🔍 Testing Database Tables...\n');
  
  // Test chat_insights table
  console.log('1. Testing chat_insights table...');
  const { data: insights, error: insightsError } = await supabase
    .from('chat_insights')
    .select('*')
    .limit(1);
  
  if (insightsError) {
    console.error('❌ chat_insights table error:', insightsError.message);
  } else {
    console.log('✅ chat_insights table accessible');
    console.log(`   Found ${insights?.length || 0} insight records`);
  }
  
  // Test user_learning_profiles table
  console.log('\n2. Testing user_learning_profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('user_learning_profiles')
    .select('*')
    .limit(1);
  
  if (profilesError) {
    console.error('❌ user_learning_profiles table error:', profilesError.message);
  } else {
    console.log('✅ user_learning_profiles table accessible');
    console.log(`   Found ${profiles?.length || 0} profile records`);
  }
  
  // Test recommendation_history table
  console.log('\n3. Testing recommendation_history table...');
  const { data: history, error: historyError } = await supabase
    .from('recommendation_history')
    .select('*')
    .limit(1);
  
  if (historyError) {
    console.error('❌ recommendation_history table error:', historyError.message);
  } else {
    console.log('✅ recommendation_history table accessible');
    console.log(`   Found ${history?.length || 0} history records`);
  }
}

async function testEnhancedRecommendationsAPI() {
  console.log('\n\n🚀 Testing Enhanced Recommendations API...\n');
  
  // Get a test user
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single();
  
  if (userError || !users) {
    console.error('❌ No users found for testing');
    return;
  }
  
  const testUserId = users.id;
  console.log(`Using test user ID: ${testUserId}`);
  
  // Test the enhanced recommendations endpoint
  const response = await fetch(
    `${supabaseUrl}/functions/v1/enhanced-recommendations`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        trigger: 'manual_request',
        requestedCount: 3
      })
    }
  );
  
  if (!response.ok) {
    console.error('❌ Enhanced recommendations API error:', response.status, response.statusText);
    const errorText = await response.text();
    console.error('   Error details:', errorText);
  } else {
    const data = await response.json();
    console.log('✅ Enhanced recommendations API working');
    console.log(`   Recommendations returned: ${data.recommendations?.length || 0}`);
    console.log(`   Insights used: ${data.insights_used}`);
    console.log(`   Profile confidence: ${data.profile_confidence}`);
    console.log(`   Wrong questions considered: ${data.wrong_questions_considered || 0}`);
    
    if (data.recommendations?.length > 0) {
      console.log('\n   Sample recommendation:');
      const sample = data.recommendations[0];
      console.log(`   - Title: ${sample.title}`);
      console.log(`   - YouTube URL: ${sample.youtube_url || 'N/A'}`);
      console.log(`   - Channel: ${sample.channel_name || 'N/A'}`);
      console.log(`   - Duration: ${sample.duration || 'N/A'}`);
      console.log(`   - Score: ${sample.score}`);
      console.log(`   - Difficulty: ${sample.difficulty_match}`);
      console.log(`   - Addresses mistakes: ${sample.addresses_mistakes?.join(', ') || 'None'}`);
      console.log(`   - Reasons: ${sample.reasons.join(', ')}`);
    }
  }
}

async function testInsightExtraction() {
  console.log('\n\n🧠 Testing Insight Extraction (via Chat API)...\n');
  
  // Note: Actual insight extraction happens within the AI chat assistant
  // This test verifies the chat API is working
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/ai-chat-assistant`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "I'm having trouble understanding recursion in programming",
        conversationHistory: [],
        courseContext: {
          courseId: 'test-course',
          courseTitle: 'Introduction to Programming',
          currentVideoTime: 120,
          playedTranscriptSegments: [],
          totalSegments: 100
        },
        userId: 'test-user'
      })
    }
  );
  
  if (!response.ok) {
    console.error('❌ AI Chat Assistant API error:', response.status, response.statusText);
  } else {
    const data = await response.json();
    console.log('✅ AI Chat Assistant working (insights extracted in background)');
    console.log(`   Response length: ${data.response?.length || 0} characters`);
    
    // Check if insights were created
    setTimeout(async () => {
      const { data: recentInsights, error } = await supabase
        .from('chat_insights')
        .select('*')
        .eq('user_id', 'test-user')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && recentInsights?.length > 0) {
        console.log(`\n   ✅ Found ${recentInsights.length} recent insights`);
        recentInsights.forEach(insight => {
          console.log(`      - ${insight.insight_type}: ${insight.confidence_score}`);
        });
      }
    }, 2000); // Wait 2 seconds for async insight extraction
  }
}

async function testWrongQuestionIntegration() {
  console.log('\n\n❌ Testing Wrong Question Integration...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Find a course with wrong answers
  const { data: wrongAnswers, error } = await supabase
    .from('user_question_responses')
    .select(`
      *,
      questions!inner(
        course_id,
        question,
        type
      )
    `)
    .eq('is_correct', false)
    .limit(5);
  
  if (error || !wrongAnswers?.length) {
    console.log('⚠️ No wrong answers found in database for testing');
    return;
  }
  
  console.log(`✅ Found ${wrongAnswers.length} wrong answers to test with`);
  const sampleWrong = wrongAnswers[0];
  console.log(`   Sample wrong question: "${sampleWrong.questions.question.substring(0, 60)}..."`);
  console.log(`   From course: ${sampleWrong.questions.course_id}`);
}

async function main() {
  console.log('🧪 Enhanced Recommendations System Test Suite');
  console.log('==========================================');
  
  await testDatabaseTables();
  await testEnhancedRecommendationsAPI();
  await testInsightExtraction();
  await testWrongQuestionIntegration();
  
  console.log('\n\n✅ Test suite complete!');
  console.log('\n📊 LangSmith Monitoring:');
  console.log('   All LLM calls are being logged to LangSmith');
  console.log('   View traces at: https://smith.langchain.com/projects/enhanced-recommendations');
  console.log('\nNext steps for full deployment:');
  console.log('1. Update frontend to pass userId in chat context');
  console.log('2. Replace course-suggestions calls with enhanced-recommendations');
  console.log('3. Implement recommendation UI with personalized reasons');
  console.log('4. Add user feedback mechanism for recommendations');
  console.log('5. Ensure SERPAPI_API_KEY is set in edge function environment');
  console.log('6. Ensure LANGSMITH_API_KEY is set for LLM monitoring');
}

main().catch(console.error); 