import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUserResponsesInRecommendations() {
  console.log('🧪 Testing User Responses in Recommendations\n');

  try {
    // Find a user with wrong answers
    const { data: wrongAnswers, error: wrongError } = await supabase
      .from('user_question_responses')
      .select(`
        *,
        questions!inner(
          id,
          question,
          type,
          options,
          correct_answer,
          explanation,
          course_id
        )
      `)
      .eq('is_correct', false)
      .limit(5);

    if (wrongError || !wrongAnswers?.length) {
      console.log('❌ No wrong answers found in database');
      return;
    }

    console.log(`✅ Found ${wrongAnswers.length} wrong answers\n`);

    // Display each wrong answer with full context
    wrongAnswers.forEach((wa, index) => {
      console.log(`\n📝 Wrong Answer ${index + 1}:`);
      console.log(`   Question: "${wa.questions.question}"`);
      console.log(`   Type: ${wa.questions.type}`);
      
      // Parse options if stored as JSON
      let options = [];
      if (wa.questions.options) {
        try {
          options = typeof wa.questions.options === 'string' 
            ? JSON.parse(wa.questions.options) 
            : wa.questions.options;
        } catch (e) {
          console.log('   ⚠️ Failed to parse options');
        }
      }

      if (options.length > 0) {
        console.log(`   Options:`);
        options.forEach((opt, idx) => {
          const isCorrect = idx === wa.questions.correct_answer;
          console.log(`     ${idx + 1}. ${opt}${isCorrect ? ' ✓' : ''}`);
        });
      }

      console.log(`   User's Answer:`);
      console.log(`     - response_text: ${wa.response_text || 'null'}`);
      console.log(`     - selected_answer: ${wa.selected_answer !== null ? wa.selected_answer : 'null'}`);
      
      // Show what the recommendation system will see
      if (wa.response_text) {
        console.log(`   🎯 Displayed as: "${wa.response_text}"`);
      } else if (wa.selected_answer !== null && options[wa.selected_answer]) {
        console.log(`   🎯 Displayed as: "${options[wa.selected_answer]}"`);
      } else {
        console.log(`   ⚠️ Displayed as: "Unknown"`);
      }
      
      console.log(`   Correct answer: ${options[wa.questions.correct_answer] || wa.questions.correct_answer}`);
      console.log(`   Course ID: ${wa.questions.course_id}`);
    });

    // Test calling the enhanced recommendations function
    console.log('\n\n🚀 Testing Enhanced Recommendations Function...\n');

    const userId = wrongAnswers[0].user_id;
    const courseId = wrongAnswers[0].questions.course_id;

    console.log(`   User ID: ${userId}`);
    console.log(`   Course ID: ${courseId}`);

    const { data: recommendationData, error: recError } = await supabase.functions.invoke(
      'enhanced-recommendations',
      {
        body: {
          userId: userId,
          courseId: courseId,
          trigger: 'course_completion',
          requestedCount: 3
        }
      }
    );

    if (recError) {
      console.error('❌ Recommendation error:', recError);
    } else {
      console.log('✅ Recommendations generated successfully');
      console.log(`   Recommendations: ${recommendationData.recommendations?.length || 0}`);
      console.log(`   Wrong questions considered: ${recommendationData.wrong_questions_considered || 0}`);
      
      if (recommendationData.recommendations?.length > 0) {
        console.log('\n📚 Recommended videos:');
        recommendationData.recommendations.forEach((rec, idx) => {
          console.log(`\n   ${idx + 1}. ${rec.title}`);
          console.log(`      Duration: ${rec.duration}`);
          console.log(`      Channel: ${rec.channel_name}`);
          if (rec.addresses_mistakes?.length > 0) {
            console.log(`      Addresses mistakes: ${rec.addresses_mistakes.join(', ')}`);
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUserResponsesInRecommendations(); 