require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWrongQuestionsForCourse() {
  console.log('🧪 Testing Wrong Questions Retrieval for Specific Course\n');

  try {
    // First, find a course that has wrong answers
    const { data: wrongAnswers, error: wrongError } = await supabase
      .from('user_question_responses')
      .select(`
        user_id,
        questions!inner(course_id)
      `)
      .eq('is_correct', false)
      .limit(10);

    if (wrongError || !wrongAnswers?.length) {
      console.log('❌ No wrong answers found');
      return;
    }

    // Group by user and course to find a good test case
    const userCoursePairs = {};
    wrongAnswers.forEach(wa => {
      const key = `${wa.user_id}|${wa.questions.course_id}`;
      userCoursePairs[key] = (userCoursePairs[key] || 0) + 1;
    });

    // Find the pair with most wrong answers
    const [bestPair, wrongCount] = Object.entries(userCoursePairs)
      .sort((a, b) => b[1] - a[1])[0];
    
    const [userId, courseId] = bestPair.split('|');
    
    console.log(`📊 Test case: User ${userId} in Course ${courseId}`);
    console.log(`   Has at least ${wrongCount} wrong answers\n`);

    // Now replicate the getWrongQuestionsFromCourse logic
    console.log('🔍 Running getWrongQuestionsFromCourse logic...\n');

    // First, check total responses for user
    const { data: allResponses } = await supabase
      .from('user_question_responses')
      .select('*')
      .eq('user_id', userId);
    
    console.log(`   Total responses for user: ${allResponses?.length || 0}`);

    // Check responses for this specific course
    const { data: courseResponses } = await supabase
      .from('user_question_responses')
      .select(`
        *,
        questions!inner(course_id)
      `)
      .eq('user_id', userId);
    
    const thisCourseResponses = (courseResponses || []).filter(
      resp => resp.questions?.course_id === courseId
    );
    
    console.log(`   Responses for THIS course: ${thisCourseResponses.length}`);
    console.log(`   Of which are wrong: ${thisCourseResponses.filter(r => !r.is_correct).length}\n`);

    // Get wrong answers with full question details
    const { data, error } = await supabase
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
          timestamp,
          metadata,
          course_id
        )
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('attempted_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching wrong questions:', error);
      return;
    }

    // Filter by course_id
    const courseWrongQuestions = (data || []).filter(
      response => response.questions?.course_id === courseId
    );

    console.log(`✅ Found ${data?.length || 0} total wrong answers across all courses`);
    console.log(`   Wrong answers for course ${courseId}: ${courseWrongQuestions.length}\n`);

    // Display wrong questions with full context
    if (courseWrongQuestions.length > 0) {
      console.log('📝 Wrong Questions Details:\n');
      
      courseWrongQuestions.slice(0, 5).forEach((wq, index) => {
        const q = wq.questions;
        console.log(`${index + 1}. ${q.type} Question: "${q.question.substring(0, 80)}..."`);
        
        // Parse options if available
        let options = [];
        if (q.options) {
          try {
            options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          } catch (e) {
            console.log('   ⚠️ Failed to parse options');
          }
        }

        if (options.length > 0) {
          console.log('   Options:');
          options.forEach((opt, idx) => {
            const isCorrect = idx === q.correct_answer;
            const isUserAnswer = wq.response_text === opt || idx === wq.selected_answer;
            console.log(`     ${idx + 1}. ${opt}${isCorrect ? ' ✓ (correct)' : ''}${isUserAnswer ? ' ← (user selected)' : ''}`);
          });
        }

        console.log(`   User Answer: ${wq.response_text || `Index ${wq.selected_answer}` || 'Unknown'}`);
        console.log(`   Correct Answer: ${options[q.correct_answer] || q.correct_answer}`);
        console.log(`   Explanation: ${q.explanation.substring(0, 100)}...`);
        console.log('');
      });
    }

    // Test the prompt building
    console.log('🎯 Testing how this appears in recommendation prompt:\n');
    
    // Simulate the prepareUserDataAnalysis output
    console.log('RECENT MISTAKES:');
    courseWrongQuestions.slice(0, 3).forEach((wq, i) => {
      const q = wq.questions;
      console.log(`${i + 1}. ${q?.type || 'Unknown'} Question: "${q?.question?.substring(0, 100)}..."`);
      
      if (q?.type === 'multiple-choice' && q?.options) {
        let options = [];
        try {
          options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch (e) {}
        
        if (options.length > 0) {
          console.log('   Options:');
          options.forEach((option, idx) => {
            const isCorrect = idx === q.correct_answer;
            const isUserAnswer = wq.response_text === option || idx === wq.selected_answer;
            console.log(`     ${idx + 1}. ${option}${isCorrect ? ' ✓ (correct)' : ''}${isUserAnswer ? ' ← (user selected)' : ''}`);
          });
        }
      } else if (q?.type === 'true-false') {
        const tfOptions = ['True', 'False'];
        const userAnswer = wq.response_text || tfOptions[wq.selected_answer] || 'Unknown';
        console.log(`   User answered: ${userAnswer}`);
        console.log(`   Correct answer: ${tfOptions[q.correct_answer === 0 ? 0 : 1]}`);
      }
      
      console.log(`   Explanation: ${q?.explanation?.substring(0, 150)}...\n`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWrongQuestionsForCourse(); 