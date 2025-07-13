require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRecommendationsWithWrongQuestions() {
  console.log('🧪 Testing Enhanced Recommendations with Wrong Questions\n');

  try {
    // Use the test case we found: User with 6 wrong answers in a specific course
    const userId = '88d64e30-4f9c-4def-8d6d-19be80272281';
    const courseId = '202a2c7a-0f09-4f5e-b91f-bd9a3ce686b9';
    
    console.log(`📊 Test Case:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Course ID: ${courseId}`);
    console.log(`   Expected: 6 wrong answers for this course\n`);

    // Call the enhanced recommendations function
    console.log('🚀 Calling enhanced-recommendations function...\n');
    
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
      return;
    }

    console.log('✅ Recommendations generated successfully');
    console.log(`   Wrong questions considered: ${recommendationData.wrong_questions_considered || 0}`);
    console.log(`   Recommendations returned: ${recommendationData.recommendations?.length || 0}\n`);

    if (recommendationData.recommendations?.length > 0) {
      console.log('📚 Recommended Videos:\n');
      recommendationData.recommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec.title}`);
        console.log(`   Duration: ${rec.duration}`);
        console.log(`   Channel: ${rec.channel_name}`);
        console.log(`   Difficulty: ${rec.difficulty_match}`);
        
        if (rec.reasons?.length > 0) {
          console.log(`   Reasons:`);
          rec.reasons.forEach(reason => {
            console.log(`     - ${reason}`);
          });
        }
        
        if (rec.addresses_mistakes?.length > 0) {
          console.log(`   Addresses these mistakes:`);
          rec.addresses_mistakes.forEach(mistake => {
            console.log(`     - ${mistake}`);
          });
        }
        
        console.log('');
      });
    }

    // Now test with a course that has NO wrong answers to see the difference
    console.log('\n🔄 Testing with a different course (should have no wrong answers)...\n');
    
    // Find a course with no wrong answers for this user
    const { data: allCourses } = await supabase
      .from('user_course_enrollments')
      .select('course_id')
      .eq('user_id', userId);
    
    const { data: wrongCourses } = await supabase
      .from('user_question_responses')
      .select(`
        questions!inner(course_id)
      `)
      .eq('user_id', userId)
      .eq('is_correct', false);
    
    const coursesWithWrongAnswers = new Set(wrongCourses?.map(w => w.questions.course_id) || []);
    const courseWithoutWrongAnswers = allCourses?.find(c => !coursesWithWrongAnswers.has(c.course_id));
    
    if (courseWithoutWrongAnswers) {
      console.log(`📊 Found course with no wrong answers: ${courseWithoutWrongAnswers.course_id}\n`);
      
      const { data: cleanRec, error: cleanError } = await supabase.functions.invoke(
        'enhanced-recommendations',
        {
          body: {
            userId: userId,
            courseId: courseWithoutWrongAnswers.course_id,
            trigger: 'course_completion',
            requestedCount: 3
          }
        }
      );
      
      if (!cleanError && cleanRec) {
        console.log('✅ Recommendations for course with no wrong answers:');
        console.log(`   Wrong questions considered: ${cleanRec.wrong_questions_considered || 0}`);
        console.log(`   This should show "RECENT MISTAKES: None found for this course" in the prompt\n`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRecommendationsWithWrongQuestions(); 