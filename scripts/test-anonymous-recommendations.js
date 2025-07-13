/**
 * Test script for anonymous user recommendations
 * 
 * This script tests the enhanced recommendations with session data for non-logged-in users
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock session data simulating an anonymous user's performance
const mockSessionData = {
  sessionId: 'test-anon-session-123',
  currentCourse: {
    id: 'test-course-1',
    title: 'JavaScript Tutorial Part 5: Functions and Scope',
    youtube_url: 'https://www.youtube.com/watch?v=test123',
    completionPercentage: 100
  },
  performance: {
    totalQuestionsAnswered: 15,
    totalQuestionsCorrect: 12,
    accuracy: 0.8, // 80% accuracy
    wrongQuestions: [
      {
        question: 'Which statement best explains why money is considered an idea or agreement rather than just physical currency?',
        userAnswer: 'Physical currency represents only a small fraction of the world\'s wealth, most of which is non-physical assets.',
        correctAnswer: 'Money works because everyone agrees it has value, and this agreement is what makes the system function.',
        type: 'multiple-choice',
        timestamp: 45,
        explanation: 'Money is fundamentally a social construct that relies on collective agreement about value, not just the physical objects we use to represent it.'
      }
    ],
    questionsByType: {
      'multiple-choice': { answered: 10, correct: 8 },
      'true-false': { answered: 5, correct: 4 }
    }
  },
  recentCourses: [
    {
      courseId: 'prev-course-1',
      title: 'JavaScript Tutorial Part 4: Arrays and Objects',
      youtube_url: 'https://www.youtube.com/watch?v=prev123',
      completionPercentage: 100,
      questionsAnswered: 12,
      questionsCorrect: 11
    },
    {
      courseId: 'prev-course-2',
      title: 'JavaScript Tutorial Part 3: Control Flow',
      youtube_url: 'https://www.youtube.com/watch?v=prev456',
      completionPercentage: 100,
      questionsAnswered: 10,
      questionsCorrect: 9
    }
  ]
};

async function testAnonymousRecommendations() {
  console.log('🧪 Testing Anonymous User Recommendations');
  console.log('=========================================\n');

  try {
    // Test 1: Call suggestions API with session data
    console.log('📝 Test 1: Calling suggestions API with session data...');
    console.log('Session accuracy:', mockSessionData.performance.accuracy);
    console.log('Wrong questions:', mockSessionData.performance.wrongQuestions.length);
    console.log('\n');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/test_anonymous_recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        sessionData: mockSessionData,
        courseId: mockSessionData.currentCourse.id,
        trigger: 'course_completion',
        requestedCount: 5
      })
    });

    // Alternative: Call the edge function directly
    const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
      body: {
        sessionData: mockSessionData,
        courseId: mockSessionData.currentCourse.id,
        trigger: 'course_completion',
        requestedCount: 5
      }
    });

    if (error) {
      console.error('❌ Error calling enhanced recommendations:', error);
      return;
    }

    console.log('✅ Recommendations received:', {
      count: data.recommendations?.length || 0,
      profileConfidence: data.profile_confidence,
      wrongQuestionsConsidered: data.wrong_questions_considered
    });
    console.log('\n');

    // Display recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      console.log('📚 Recommended Videos:');
      console.log('====================\n');

      data.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.title}`);
        console.log(`   Channel: ${rec.channel_name}`);
        console.log(`   Duration: ${rec.duration}`);
        console.log(`   Progression Type: ${rec.progression_type || 'N/A'}`);
        console.log(`   Difficulty: ${rec.difficulty_match}`);
        console.log(`   Reasons:`);
        rec.reasons.forEach(reason => {
          console.log(`   - ${reason}`);
        });
        if (rec.addresses_mistakes && rec.addresses_mistakes.length > 0) {
          console.log(`   Addresses Mistakes:`);
          rec.addresses_mistakes.forEach(mistake => {
            console.log(`   - ${mistake}`);
          });
        }
        console.log('\n');
      });
    }

    // Test 2: Different accuracy levels
    console.log('📝 Test 2: Testing different accuracy levels...\n');

    const accuracyTests = [
      { accuracy: 0.9, desc: 'High performer (90%)' },
      { accuracy: 0.6, desc: 'Medium performer (60%)' },
      { accuracy: 0.3, desc: 'Low performer (30%)' }
    ];

    for (const test of accuracyTests) {
      const testSession = {
        ...mockSessionData,
        performance: {
          ...mockSessionData.performance,
          accuracy: test.accuracy,
          totalQuestionsCorrect: Math.floor(mockSessionData.performance.totalQuestionsAnswered * test.accuracy)
        }
      };

      const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
        body: {
          sessionData: testSession,
          courseId: mockSessionData.currentCourse.id,
          trigger: 'course_completion',
          requestedCount: 3
        }
      });

      if (!error && data.recommendations) {
        console.log(`\n${test.desc}:`);
        console.log('Progression types:', data.recommendations.map(r => r.progression_type).join(', '));
        console.log('Difficulty matches:', data.recommendations.map(r => r.difficulty_match).join(', '));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAnonymousRecommendations()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  }); 