require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGetUserPerformanceData() {
  console.log('🧪 Testing getUserPerformanceData Function\n');

  try {
    // First, get a user who has answered questions
    const { data: users, error: userError } = await supabase
      .from('user_question_responses')
      .select('user_id')
      .limit(1);

    if (userError || !users?.length) {
      console.log('❌ No users with question responses found');
      return;
    }

    const testUserId = users[0].user_id;
    console.log(`📊 Testing with user: ${testUserId}\n`);

    // Replicate the getUserPerformanceData logic
    console.log('🔍 Fetching performance data...');
    
    const { data, error } = await supabase
      .from('user_question_responses')
      .select(`
        *,
        questions!inner(
          course_id,
          type,
          timestamp,
          question,
          options,
          correct_answer,
          explanation
        )
      `)
      .eq('user_id', testUserId)
      .order('attempted_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Error fetching performance data:', error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} performance records\n`);

    // Calculate accuracy
    if (data && data.length > 0) {
      const correctCount = data.filter(d => d.is_correct).length;
      const accuracy = (correctCount / data.length * 100).toFixed(1);
      console.log(`📈 Overall Performance:`);
      console.log(`   - Total questions answered: ${data.length}`);
      console.log(`   - Correct answers: ${correctCount}`);
      console.log(`   - Wrong answers: ${data.length - correctCount}`);
      console.log(`   - Accuracy: ${accuracy}%\n`);

      // Break down by question type
      const typeBreakdown = {};
      data.forEach(response => {
        const type = response.questions?.type || 'unknown';
        if (!typeBreakdown[type]) {
          typeBreakdown[type] = { total: 0, correct: 0 };
        }
        typeBreakdown[type].total++;
        if (response.is_correct) {
          typeBreakdown[type].correct++;
        }
      });

      console.log(`📊 Performance by Question Type:`);
      Object.entries(typeBreakdown).forEach(([type, stats]) => {
        const typeAccuracy = (stats.correct / stats.total * 100).toFixed(1);
        console.log(`   - ${type}: ${typeAccuracy}% (${stats.correct}/${stats.total})`);
      });

      // Show sample responses
      console.log(`\n📝 Sample Responses (first 5):`);
      data.slice(0, 5).forEach((response, index) => {
        console.log(`\n   ${index + 1}. Question: "${response.questions?.question?.substring(0, 60)}..."`);
        console.log(`      Type: ${response.questions?.type}`);
        console.log(`      Is Correct: ${response.is_correct ? '✅' : '❌'}`);
        console.log(`      Response Text: ${response.response_text || 'null'}`);
        console.log(`      Selected Answer: ${response.selected_answer !== null ? response.selected_answer : 'null'}`);
        console.log(`      Course ID: ${response.questions?.course_id}`);
        
        // Parse and show options for context
        if (response.questions?.options) {
          try {
            const options = typeof response.questions.options === 'string' 
              ? JSON.parse(response.questions.options) 
              : response.questions.options;
            if (options.length > 0) {
              console.log(`      Options: ${options.join(', ')}`);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });

      // Check if we have course variety
      const uniqueCourses = new Set(data.map(d => d.questions?.course_id).filter(Boolean));
      console.log(`\n📚 Unique courses in performance data: ${uniqueCourses.size}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGetUserPerformanceData(); 