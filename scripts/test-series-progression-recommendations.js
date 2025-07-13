/**
 * Test script for enhanced recommendations with series progression support
 * 
 * This script tests:
 * 1. Series detection from video titles
 * 2. Performance-based progression
 * 3. Natural topic advancement
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Test scenarios
const testScenarios = [
  {
    name: "Series Video - High Performance",
    userId: "test-user-series-high",
    currentVideo: {
      title: "JavaScript Tutorial Part 5: Functions and Scope",
      description: "In this fifth part of our JavaScript series, we dive deep into functions and scope...",
      youtube_url: "https://youtube.com/watch?v=test1"
    },
    performance: {
      totalQuestions: 10,
      correctAnswers: 9,
      wrongQuestions: []
    },
    expectedBehavior: "Should prioritize Part 6 of the series"
  },
  {
    name: "Series Video - Low Performance",
    userId: "test-user-series-low",
    currentVideo: {
      title: "Data Structures Episode 3: Linked Lists",
      description: "Episode 3 of our data structures course covers linked lists...",
      youtube_url: "https://youtube.com/watch?v=test2"
    },
    performance: {
      totalQuestions: 10,
      correctAnswers: 4,
      wrongQuestions: [
        {
          question: "What is the time complexity of inserting at the head of a linked list?",
          userAnswer: "O(n)",
          correctAnswer: "O(1)"
        }
      ]
    },
    expectedBehavior: "Should suggest review content before Episode 4"
  },
  {
    name: "Non-Series Video - Natural Progression",
    userId: "test-user-progression",
    currentVideo: {
      title: "Introduction to Machine Learning",
      description: "Learn the basics of machine learning, including supervised and unsupervised learning...",
      youtube_url: "https://youtube.com/watch?v=test3"
    },
    performance: {
      totalQuestions: 8,
      correctAnswers: 7,
      wrongQuestions: []
    },
    expectedBehavior: "Should suggest intermediate ML topics like 'Neural Networks Basics'"
  }
];

async function testRecommendations(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Create a mock course for testing
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: scenario.currentVideo.title,
        description: scenario.currentVideo.description,
        youtube_url: scenario.currentVideo.youtube_url,
        published: true,
        created_by: scenario.userId
      })
      .select()
      .single();
    
    if (courseError) throw courseError;
    
    console.log(`✅ Created test course: ${course.id}`);
    
    // Create mock performance data
    const accuracy = (scenario.performance.correctAnswers / scenario.performance.totalQuestions * 100).toFixed(0);
    console.log(`📊 User Performance: ${accuracy}% (${scenario.performance.correctAnswers}/${scenario.performance.totalQuestions})`);
    
    // Call the enhanced recommendations function
    const response = await fetch(`${supabaseUrl}/functions/v1/enhanced-recommendations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRole}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: scenario.userId,
        courseId: course.id,
        trigger: 'course_completion',
        requestedCount: 5
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }
    
    const result = await response.json();
    
    console.log(`\n📹 Recommendations received: ${result.recommendations?.length || 0}`);
    console.log(`Expected behavior: ${scenario.expectedBehavior}`);
    
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('\nTop 3 Recommendations:');
      result.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`\n${index + 1}. ${rec.title}`);
        console.log(`   URL: ${rec.youtube_url}`);
        console.log(`   Duration: ${rec.duration}`);
        console.log(`   Progression Type: ${rec.progression_type || 'Not specified'}`);
        console.log(`   Score: ${rec.score}`);
        console.log(`   Reasons:`);
        rec.reasons.forEach(reason => console.log(`   - ${reason}`));
        if (rec.addresses_mistakes && rec.addresses_mistakes.length > 0) {
          console.log(`   Addresses Mistakes:`);
          rec.addresses_mistakes.forEach(mistake => console.log(`   - ${mistake}`));
        }
      });
    }
    
    // Analyze results
    console.log('\n📊 Analysis:');
    
    // Check for series continuation
    const seriesContinuation = result.recommendations?.find(r => 
      r.progression_type === 'series_continuation' ||
      r.title.toLowerCase().includes('part 6') ||
      r.title.toLowerCase().includes('episode 4')
    );
    
    if (seriesContinuation && scenario.name.includes('High Performance')) {
      console.log('✅ Correctly prioritized series continuation for high performance');
    } else if (!seriesContinuation && scenario.name.includes('Low Performance')) {
      console.log('✅ Correctly avoided series continuation for low performance');
    }
    
    // Check for natural progression
    const hasProgression = result.recommendations?.some(r =>
      r.progression_type === 'topic_advancement' ||
      r.reasons.some(reason => reason.toLowerCase().includes('natural') || reason.toLowerCase().includes('progression'))
    );
    
    if (hasProgression) {
      console.log('✅ Recommendations show natural topic progression');
    }
    
    // Cleanup
    await supabase.from('courses').delete().eq('id', course.id);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function runAllTests() {
  console.log('🧪 Testing Enhanced Recommendations with Series Progression Support');
  console.log('📅 Date:', new Date().toISOString());
  
  for (const scenario of testScenarios) {
    await testRecommendations(scenario);
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ All tests completed');
}

// Run tests
runAllTests().catch(console.error); 