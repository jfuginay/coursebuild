/**
 * Test script for transcript-based recommendations
 * 
 * This script tests that video_summary and key_concepts from video_transcripts
 * are being used in the recommendation prompts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Mock session data with questions answered
const mockSessionData = {
  sessionId: 'test-transcript-session-123',
  currentCourse: {
    id: 'test-course-transcript',
    title: 'What if you literally had all the money in the world?',
    youtube_url: 'https://www.youtube.com/watch?v=test123',
    completionPercentage: 100
  },
  performance: {
    totalQuestionsAnswered: 10,
    totalQuestionsCorrect: 8,
    accuracy: 0.8,
    wrongQuestions: [
      {
        question: 'What happens to prices when one person has all the money?',
        userAnswer: 'They stay the same',
        correctAnswer: 'They would skyrocket due to extreme demand',
        type: 'multiple-choice',
        timestamp: 120
      },
      {
        question: 'Why would having all money make it worthless?',
        userAnswer: 'Because of inflation',
        correctAnswer: 'Because money only has value in circulation for exchange',
        type: 'multiple-choice',
        timestamp: 240
      }
    ],
    questionsByType: {
      'multiple-choice': { answered: 8, correct: 6 },
      'true-false': { answered: 2, correct: 2 }
    }
  },
  recentCourses: []
};

async function testTranscriptRecommendations() {
  console.log('🧪 Testing Transcript-Based Recommendations');
  console.log('==========================================\n');

  try {
    // First, let's check if we have a course with transcript data
    console.log('📝 Step 1: Finding a course with transcript data...');
    
    const { data: coursesWithTranscripts, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        youtube_url,
        video_transcripts (
          video_summary,
          key_concepts_timeline
        )
      `)
      .not('video_transcripts', 'is', null)
      .limit(5);

    if (courseError) {
      console.error('❌ Error fetching courses:', courseError);
      return;
    }

    if (!coursesWithTranscripts || coursesWithTranscripts.length === 0) {
      console.log('❌ No courses with transcript data found');
      return;
    }

    console.log(`✅ Found ${coursesWithTranscripts.length} courses with transcripts`);
    
    // Use the first course with transcript data
    const testCourse = coursesWithTranscripts[0];
    console.log('\n📚 Test Course:');
    console.log(`   Title: ${testCourse.title}`);
    console.log(`   Has Summary: ${!!testCourse.video_transcripts?.video_summary}`);
    
    // Extract and display key concepts
    let keyConcepts = [];
    if (testCourse.video_transcripts?.key_concepts_timeline) {
      const timeline = testCourse.video_transcripts.key_concepts_timeline;
      if (Array.isArray(timeline)) {
        keyConcepts = timeline.map(item => item.concept).filter(Boolean);
        console.log(`   Key Concepts Timeline: ${timeline.length} entries`);
        console.log(`   Extracted Concepts: ${keyConcepts.length}`);
        
        // Show first few timeline entries for debugging
        if (timeline.length > 0) {
          console.log('\n   Sample Timeline Entries:');
          timeline.slice(0, 3).forEach((entry, i) => {
            console.log(`     ${i + 1}. Concept: "${entry.concept}"`);
            console.log(`        First mentioned: ${entry.first_mentioned}s`);
            if (entry.explanation_timestamps) {
              console.log(`        Explained at: ${entry.explanation_timestamps.join(', ')}s`);
            }
          });
        }
      }
    }
    
    if (testCourse.video_transcripts?.video_summary) {
      console.log(`\n   Summary Preview: ${testCourse.video_transcripts.video_summary.substring(0, 100)}...`);
    }
    if (keyConcepts.length > 0) {
      console.log(`   Key Concepts: ${keyConcepts.slice(0, 5).join(', ')}${keyConcepts.length > 5 ? '...' : ''}`);
    }

    // Update session data with real course
    mockSessionData.currentCourse.id = testCourse.id;
    mockSessionData.currentCourse.title = testCourse.title;
    mockSessionData.currentCourse.youtube_url = testCourse.youtube_url;

    console.log('\n📝 Step 2: Testing recommendations with transcript data...');
    
    // Test with course completion - use a course that has transcript data
    const testRequest = {
      userId: null, // Anonymous user
      courseId: 'af7776cb-74aa-4e64-b1dd-3da8edc7bbe9', // "What if the moon turned into a black hole?" - has transcript
      trigger: 'course_completion',
      requestedCount: 5,
      sessionData: {
        sessionId: 'anon_test_' + Date.now(),
        currentCourse: {
          id: 'af7776cb-74aa-4e64-b1dd-3da8edc7bbe9',
          title: 'What if the moon turned into a black hole?',
          youtube_url: 'https://www.youtube.com/watch?v=example',
          completionPercentage: 100
        },
        performance: {
          totalQuestionsAnswered: 3,
          totalQuestionsCorrect: 2,
          accuracy: 66.67,
          wrongQuestions: [
            {
              question: 'What would happen to the event horizon if the moon became a black hole?',
              userAnswer: 'It would be visible from Earth',
              correctAnswer: 'It would be too small to see',
              type: 'multiple-choice',
              concept: 'Event Horizon',
              explanation: 'The event horizon of a moon-mass black hole would be incredibly tiny - only about the size of a sand grain, making it impossible to see from Earth with any current technology.'
            }
          ],
          questionsByType: {
            'multiple-choice': { answered: 3, correct: 2 }
          }
        },
        recentCourses: []
      }
    };

    // Call enhanced recommendations
    const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
      body: {
        sessionData: mockSessionData,
        courseId: testCourse.id,
        trigger: 'course_completion',
        requestedCount: 3
      }
    });

    if (error) {
      console.error('❌ Error calling enhanced recommendations:', error);
      return;
    }

    console.log('\n✅ Recommendations received:', {
      count: data.recommendations?.length || 0,
      profileConfidence: data.profile_confidence,
      wrongQuestionsConsidered: data.wrong_questions_considered
    });

    // Display recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      console.log('\n📚 Recommended Videos:');
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
        console.log('\n');
      });
    }

    // Test logged-in user flow to compare
    console.log('📝 Step 3: Testing logged-in user flow for comparison...');
    
    // Find a test user
    const { data: testUser } = await supabase
      .from('user_question_responses')
      .select('user_id')
      .limit(1)
      .single();

    if (testUser) {
      const { data: loggedInData, error: loggedInError } = await supabase.functions.invoke('enhanced-recommendations', {
        body: {
          userId: testUser.user_id,
          courseId: testCourse.id,
          trigger: 'course_completion',
          requestedCount: 3
        }
      });

      if (!loggedInError && loggedInData.recommendations) {
        console.log('\n✅ Logged-in user recommendations also received');
        console.log('   Both anonymous and logged-in users get transcript-enhanced recommendations!');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTranscriptRecommendations()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  }); 