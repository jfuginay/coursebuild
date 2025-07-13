#!/usr/bin/env node

/**
 * Test script for fact-check functionality
 */

const fetch = require('node-fetch');

async function testFactCheck() {
  console.log('🧪 Testing fact-check functionality...\n');

  const testData = {
    question: "What is the capital of France?",
    userAnswer: "London",
    correctAnswer: "Paris",
    explanation: "Paris is the capital and most populous city of France.",
    courseId: "test-course-id"
  };

  try {
    // Test local API endpoint
    console.log('📡 Testing local API endpoint...');
    const localUrl = 'http://localhost:3000/api/fact-check';
    
    const localResponse = await fetch(localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', localResponse.status);
    
    if (!localResponse.ok) {
      const errorText = await localResponse.text();
      console.error('❌ API Error:', errorText);
      
      // Try calling the edge function directly
      console.log('\n📡 Testing edge function directly...');
      const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fact-check-service`;
      
      const edgeResponse = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          question: testData.question,
          userAnswer: testData.userAnswer,
          supposedCorrectAnswer: testData.correctAnswer,
          explanation: testData.explanation,
          courseContext: { 
            courseId: testData.courseId,
            courseTitle: 'Test Course'
          }
        })
      });

      console.log('Edge function status:', edgeResponse.status);
      const edgeData = await edgeResponse.json();
      console.log('Edge function response:', JSON.stringify(edgeData, null, 2));
    } else {
      const data = await localResponse.json();
      console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testFactCheck(); 