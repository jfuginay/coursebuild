#!/usr/bin/env node

/**
 * Test script to verify the visual quiz integration
 * Tests the complete backend pipeline with visual questions
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'your-anon-key';
const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll for testing

async function testVisualQuizGeneration() {
  console.log('🧪 Testing Visual Quiz Integration...');
  console.log('=' .repeat(60));
  
  try {
    // Test the quiz generation v4 endpoint
    const testPayload = {
      course_id: 'test-visual-quiz-' + Date.now(),
      youtube_url: TEST_YOUTUBE_URL,
      max_questions: 4,
      enable_quality_verification: false,
      enable_visual_questions: true // Enable visual questions
    };
    
    console.log('📋 Test Configuration:');
    console.log(`   YouTube URL: ${testPayload.youtube_url}`);
    console.log(`   Course ID: ${testPayload.course_id}`);
    console.log(`   Max Questions: ${testPayload.max_questions}`);
    console.log(`   Visual Questions: ${testPayload.enable_visual_questions}`);
    console.log('');
    
    console.log('🚀 Calling quiz-generation-v4 endpoint...');
    const startTime = Date.now();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/quiz-generation-v4`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify(testPayload)
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`⏱️  Request completed in ${duration.toFixed(2)}s`);
    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Response: ${errorText}`);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Request successful!');
    console.log('');
    
    // Analyze the response
    console.log('📊 Response Analysis:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Total Questions: ${result.final_questions?.length || 0}`);
    
    if (result.pipeline_metadata) {
      console.log(`   Processing Time: ${result.pipeline_metadata.total_time_ms}ms`);
      console.log(`   Success Rate: ${(result.pipeline_metadata.success_rate * 100).toFixed(1)}%`);
      console.log(`   Providers Used: ${result.pipeline_metadata.providers_used?.join(', ') || 'N/A'}`);
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.length}`);
      result.warnings.forEach(warning => console.log(`     - ${warning}`));
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
      result.errors.forEach(error => console.log(`     - ${error}`));
    }
    
    console.log('');
    
    // Analyze question types
    if (result.final_questions && result.final_questions.length > 0) {
      console.log('📝 Question Type Analysis:');
      
      const questionTypes = {};
      const visualQuestions = [];
      
      result.final_questions.forEach((question, index) => {
        const type = question.type || 'unknown';
        questionTypes[type] = (questionTypes[type] || 0) + 1;
        
        // Check if this is a visual question
        if (['hotspot', 'matching', 'sequencing'].includes(type)) {
          visualQuestions.push(question);
        }
        
        console.log(`   ${index + 1}. ${type.toUpperCase()}: ${question.question?.substring(0, 50)}...`);
      });
      
      console.log('');
      console.log('📊 Type Distribution:');
      Object.entries(questionTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} questions`);
      });
      
      console.log('');
      console.log(`🎯 Visual Questions Found: ${visualQuestions.length}`);
      
      if (visualQuestions.length > 0) {
        console.log('');
        console.log('👁️ Visual Question Details:');
        visualQuestions.forEach((question, index) => {
          console.log(`   ${index + 1}. ${question.type.toUpperCase()}: ${question.question_id}`);
          console.log(`      Question: ${question.question?.substring(0, 80)}...`);
          
          if (question.type === 'hotspot') {
            console.log(`      Bounding Boxes: ${question.bounding_boxes?.length || 0}`);
            console.log(`      Frame Timestamp: ${question.frame_timestamp}s`);
          } else if (question.type === 'matching') {
            console.log(`      Matching Pairs: ${question.matching_pairs?.length || 0}`);
          } else if (question.type === 'sequencing') {
            console.log(`      Sequence Items: ${question.sequence_items?.length || 0}`);
          }
          
          console.log(`      Provider: ${question.provider_used || 'N/A'}`);
          console.log('');
        });
      }
    }
    
    // Test result
    const hasVisualQuestions = result.final_questions?.some(q => 
      ['hotspot', 'matching', 'sequencing'].includes(q.type)
    );
    
    console.log('🎯 Integration Test Results:');
    console.log(`   ✅ Backend API: ${result.success ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Visual Questions: ${hasVisualQuestions ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Question Generation: ${result.final_questions?.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Response Time: ${duration < 60 ? 'PASS' : 'FAIL'} (${duration.toFixed(2)}s)`);
    
    const overallPass = result.success && hasVisualQuestions && result.final_questions?.length > 0;
    console.log('');
    console.log(`🎉 Overall Result: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallPass) {
      console.log('');
      console.log('🎊 Visual Quiz Integration Test Complete!');
      console.log('   The backend visual generation pipeline is working correctly.');
      console.log('   Ready to test frontend integration.');
    } else {
      console.log('');
      console.log('⚠️  Some tests failed. Check the logs above for details.');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
console.log('🧪 Visual Quiz Integration Test');
console.log('Testing complete backend pipeline with visual questions...');
console.log('');

testVisualQuizGeneration();