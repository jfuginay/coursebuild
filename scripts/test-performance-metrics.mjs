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

// Simple test data focused on performance metrics
const mockSessionData = {
  sessionId: 'test-metrics-session',
  currentCourse: {
    id: 'test-course',
    title: 'Test Course',
    youtube_url: 'https://www.youtube.com/watch?v=test',
    completionPercentage: 100
  },
  performance: {
    totalQuestionsAnswered: 10,
    totalQuestionsCorrect: 6,
    accuracy: 60,
    wrongQuestions: [
      {
        question: 'What is 2+2?',
        userAnswer: '5',
        correctAnswer: '4',
        type: 'multiple-choice',
        courseId: 'test-course'
      }
    ],
    questionsByType: {
      'multiple-choice': { answered: 5, correct: 3 },
      'true-false': { answered: 5, correct: 3 }
    }
  },
  recentCourses: []
};

async function testPerformanceMetrics() {
  console.log('🧪 Testing performance metrics for anonymous users...\n');
  
  console.log('📊 Session Data:');
  console.log(`- Total Questions: ${mockSessionData.performance.totalQuestionsAnswered}`);
  console.log(`- Correct: ${mockSessionData.performance.totalQuestionsCorrect}`);
  console.log(`- Accuracy: ${mockSessionData.performance.accuracy}%`);
  console.log(`- By Type:`, mockSessionData.performance.questionsByType);
  console.log();

  try {
    // Make a request with debug mode
    const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
      body: {
        courseId: 'test-course',
        trigger: 'manual_request',
        requestedCount: 1,
        sessionData: mockSessionData,
        debug: true // Request debug info
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Response received');
    
    // Look for performance metrics in the response
    if (data.debug) {
      console.log('\n🔍 Debug Info:');
      console.log(JSON.stringify(data.debug, null, 2));
    }
    
    // Check if recommendations were generated
    if (data.recommendations?.length > 0) {
      console.log('\n✅ Recommendations generated successfully');
      console.log(`Count: ${data.recommendations.length}`);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testPerformanceMetrics(); 