#!/usr/bin/env node

/**
 * Test script for segment questions API endpoint
 * 
 * Usage:
 *   node scripts/test-segment-questions.js <course_id>
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testSegmentQuestions(courseId) {
  console.log('🧪 Testing segment questions API...\n');

  try {
    // Test 1: Fetch all questions from completed segments
    console.log('📊 Test 1: Fetching questions from completed segments only...');
    const completedResponse = await fetch(`${API_URL}/api/course/${courseId}/segment-questions?completed_only=true`);
    const completedData = await completedResponse.json();
    
    if (completedData.success) {
      console.log('✅ Success!');
      console.log(`   Total segments: ${completedData.total_segments}`);
      console.log(`   Completed segments: ${completedData.completed_segments}`);
      console.log(`   Progress: ${completedData.progress_percentage}%`);
      console.log(`   Questions loaded: ${completedData.questions.length}`);
      
      // Show segment breakdown
      if (completedData.segments && completedData.segments.length > 0) {
        console.log('\n📋 Segment Status:');
        completedData.segments.forEach(segment => {
          const status = segment.status === 'completed' ? '✅' : 
                        segment.status === 'processing' ? '⏳' : 
                        segment.status === 'failed' ? '❌' : '⏸️';
          console.log(`   Segment ${segment.segment_index + 1}: ${status} ${segment.status} (${segment.questions_count || 0} questions)`);
        });
      }
    } else {
      console.error('❌ Failed:', completedData.error);
    }

    // Test 2: Fetch questions from a specific segment
    if (completedData.segments && completedData.segments.length > 0) {
      const firstCompletedSegment = completedData.segments.find(s => s.status === 'completed');
      
      if (firstCompletedSegment) {
        console.log(`\n📊 Test 2: Fetching questions from segment ${firstCompletedSegment.segment_index + 1}...`);
        const segmentResponse = await fetch(`${API_URL}/api/course/${courseId}/segment-questions?segment_index=${firstCompletedSegment.segment_index}`);
        const segmentData = await segmentResponse.json();
        
        if (segmentData.success) {
          console.log('✅ Success!');
          console.log(`   Questions in segment: ${segmentData.questions.length}`);
          
          // Show sample question
          if (segmentData.questions.length > 0) {
            const sampleQuestion = segmentData.questions[0];
            console.log('\n📝 Sample question:');
            console.log(`   Type: ${sampleQuestion.type}`);
            console.log(`   Question: ${sampleQuestion.question.substring(0, 100)}...`);
            console.log(`   Timestamp: ${sampleQuestion.timestamp}s`);
            console.log(`   Segment: ${sampleQuestion.segment_index + 1}`);
          }
        } else {
          console.error('❌ Failed:', segmentData.error);
        }
      }
    }

    // Test 3: Fetch all questions (no filter)
    console.log('\n📊 Test 3: Fetching all questions (no filter)...');
    const allResponse = await fetch(`${API_URL}/api/course/${courseId}/segment-questions`);
    const allData = await allResponse.json();
    
    if (allData.success) {
      console.log('✅ Success!');
      console.log(`   Total questions: ${allData.questions.length}`);
      
      // Group by segment
      const questionsBySegment = {};
      allData.questions.forEach(q => {
        const segIdx = q.segment_index || 0;
        questionsBySegment[segIdx] = (questionsBySegment[segIdx] || 0) + 1;
      });
      
      console.log('\n📊 Questions by segment:');
      Object.entries(questionsBySegment).forEach(([segIdx, count]) => {
        console.log(`   Segment ${parseInt(segIdx) + 1}: ${count} questions`);
      });
    } else {
      console.error('❌ Failed:', allData.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
const courseId = process.argv[2];
if (!courseId) {
  console.error('Usage: node scripts/test-segment-questions.js <course_id>');
  process.exit(1);
}

testSegmentQuestions(courseId); 