import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock session data with a mix of correct and incorrect answers
const mockSessionData = {
  sessionId: 'test-wrong-questions-session',
  currentCourse: {
    id: 'test-course-current',
    title: 'Introduction to Flood Narratives',
    youtube_url: 'https://www.youtube.com/watch?v=flood123',
    completionPercentage: 100
  },
  performance: {
    totalQuestionsAnswered: 10,
    totalQuestionsCorrect: 6,
    accuracy: 60,
    wrongQuestions: [
      // Actually wrong - user answered differently
      {
        question: 'Flood narratives are unique to the Mesopotamian and Egyptian cultures and do not appear in other ancient civilizations.',
        userAnswer: 'True',
        correctAnswer: 'False',
        type: 'true-false',
        timestamp: 120,
        explanation: 'The statement is false because flood narratives are a common theme found across many ancient cultures.',
        courseId: 'test-course-current'
      },
      // Actually correct - should be filtered out
      {
        question: 'The discovery of Doggerland and Zealandia provides definitive proof that all mythological narratives are based on historical events.',
        userAnswer: 'False',
        correctAnswer: 'False',
        type: 'true-false',
        timestamp: 240,
        explanation: 'While the discoveries offer evidence of geological changes, they do not prove all myths are historical.',
        courseId: 'test-course-current'
      },
      // Wrong answer from different course - should be filtered out
      {
        question: 'Who first documented the story of Atlantis?',
        userAnswer: 'Aristotle',
        correctAnswer: 'Plato',
        type: 'multiple-choice',
        timestamp: 60,
        explanation: 'Plato first documented the story of Atlantis in his dialogues.',
        courseId: 'different-course-id'
      },
      // Actually wrong - different answer
      {
        question: 'What is the primary purpose of flood narratives across cultures?',
        userAnswer: 'To explain natural disasters',
        correctAnswer: 'To convey moral and spiritual lessons',
        type: 'multiple-choice',
        timestamp: 300,
        explanation: 'Flood narratives primarily serve to convey moral and spiritual lessons about divine judgment.',
        courseId: 'test-course-current'
      }
    ],
    questionsByType: {
      'multiple-choice': { answered: 5, correct: 3 },
      'true-false': { answered: 5, correct: 3 }
    }
  },
  recentCourses: []
};

async function testAnonymousWrongQuestions() {
  console.log('🧪 Testing anonymous user wrong questions handling...\n');

  try {
    // Test the enhanced recommendations with session data
    const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
      body: {
        courseId: 'test-course-current',
        trigger: 'course_completion',
        requestedCount: 3,
        sessionData: mockSessionData
      }
    });

    if (error) {
      console.error('❌ Error calling enhanced-recommendations:', error);
      return;
    }

    console.log('✅ Enhanced recommendations response received');
    console.log('\n📊 Response summary:', {
      recommendationCount: data.recommendations?.length || 0,
      hasReasons: data.recommendations?.[0]?.reasons?.length > 0,
      addressesMistakes: data.recommendations?.[0]?.addresses_mistakes?.length > 0
    });

    // Check the debug information
    if (data.debug) {
      console.log('\n🔍 Debug information:');
      console.log('Wrong questions processed:', data.debug.wrongQuestionsCount);
      console.log('Profile accuracy:', data.debug.profileAccuracy);
    }

    // Display the recommendations
    if (data.recommendations?.length > 0) {
      console.log('\n📚 Recommendations:');
      data.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. ${rec.title}`);
        console.log(`   Channel: ${rec.channel_name}`);
        console.log(`   Duration: ${rec.duration}`);
        console.log(`   Reasons:`);
        rec.reasons?.forEach(reason => console.log(`     - ${reason}`));
        if (rec.addresses_mistakes?.length > 0) {
          console.log(`   Addresses mistakes:`);
          rec.addresses_mistakes.forEach(mistake => console.log(`     - ${mistake}`));
        }
      });
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the test
testAnonymousWrongQuestions(); 