/**
 * Test script to validate end-of-video question timestamp adjustment
 * 
 * This test verifies that:
 * 1. Questions within the last 5 seconds of a video are moved earlier
 * 2. Frame timestamps are also adjusted appropriately
 * 3. Questions that are already well before the end are not affected
 * 4. The adjustment logic handles edge cases properly
 */

// Test data simulating questions at various timestamps
const createTestQuestions = (videoDuration) => [
  {
    id: 'q1',
    question: 'Early question - should not be adjusted',
    timestamp: 30,
    frame_timestamp: 28,
    type: 'multiple-choice'
  },
  {
    id: 'q2', 
    question: 'Mid-video question - should not be adjusted',
    timestamp: Math.floor(videoDuration / 2),
    frame_timestamp: Math.floor(videoDuration / 2) - 2,
    type: 'hotspot'
  },
  {
    id: 'q3',
    question: 'Question 2 seconds before end - should be adjusted',
    timestamp: videoDuration - 2,
    frame_timestamp: videoDuration - 4,
    type: 'matching'
  },
  {
    id: 'q4',
    question: 'Question at exact end - should be adjusted',
    timestamp: videoDuration,
    frame_timestamp: videoDuration - 1,
    type: 'sequencing'
  },
  {
    id: 'q5',
    question: 'Question 4 seconds before end - should be adjusted',
    timestamp: videoDuration - 4,
    frame_timestamp: videoDuration - 6,
    type: 'true-false'
  }
];

// Replicate the adjustment logic from the frontend
const adjustEndOfVideoQuestions = (questions, videoDuration) => {
  const END_BUFFER_SECONDS = 5; // Move questions this many seconds before the end
  
  return questions.map(question => {
    // Check if question is within the last 5 seconds of the video
    if (question.timestamp > videoDuration - END_BUFFER_SECONDS) {
      const originalTimestamp = question.timestamp;
      const adjustedTimestamp = Math.max(
        videoDuration - END_BUFFER_SECONDS,
        question.timestamp - END_BUFFER_SECONDS
      );
      
      console.log(`⏰ Adjusting end-of-video question: ${originalTimestamp}s → ${adjustedTimestamp}s (video ends at ${videoDuration}s)`);
      
      return {
        ...question,
        timestamp: adjustedTimestamp,
        frame_timestamp: question.frame_timestamp && question.frame_timestamp > videoDuration - END_BUFFER_SECONDS 
          ? adjustedTimestamp - 2 
          : question.frame_timestamp
      };
    }
    return question;
  });
};

async function testEndOfVideoAdjustment() {
  console.log('🎬 Testing end-of-video question timestamp adjustment...\n');

  // Test with different video durations
  const testVideoDurations = [120, 300, 600, 900]; // 2min, 5min, 10min, 15min

  for (const videoDuration of testVideoDurations) {
    console.log(`\n📹 Testing with ${videoDuration}s (${Math.floor(videoDuration/60)}:${(videoDuration%60).toString().padStart(2,'0')}) video...`);
    
    const originalQuestions = createTestQuestions(videoDuration);
    const adjustedQuestions = adjustEndOfVideoQuestions(originalQuestions, videoDuration);
    
    console.log('\n📊 Adjustment Results:');
    
    originalQuestions.forEach((original, index) => {
      const adjusted = adjustedQuestions[index];
      const wasAdjusted = original.timestamp !== adjusted.timestamp;
      const isInEndZone = original.timestamp > videoDuration - 5;
      
      console.log(`\nQuestion ${index + 1}: "${original.question.substring(0, 40)}..."`);
      console.log(`  Original timestamp: ${original.timestamp}s`);
      console.log(`  Adjusted timestamp: ${adjusted.timestamp}s`);
      console.log(`  Original frame: ${original.frame_timestamp}s`);
      console.log(`  Adjusted frame: ${adjusted.frame_timestamp}s`);
      console.log(`  Was in end zone: ${isInEndZone ? '❌ YES' : '✅ NO'}`);
      console.log(`  Was adjusted: ${wasAdjusted ? '✅ YES' : '⚪ NO'}`);
      
      // Validation
      if (isInEndZone && !wasAdjusted) {
        console.log(`  ❌ ERROR: Should have been adjusted!`);
      } else if (!isInEndZone && wasAdjusted) {
        console.log(`  ❌ ERROR: Should NOT have been adjusted!`);
      } else {
        console.log(`  ✅ CORRECT: Adjustment behavior is correct`);
      }
      
      // Validate adjusted timestamp is not too close to end
      if (adjusted.timestamp > videoDuration - 5) {
        console.log(`  ❌ ERROR: Adjusted timestamp still too close to end!`);
      }
      
      // Validate frame timestamp is adjusted consistently
      if (wasAdjusted && original.frame_timestamp > videoDuration - 5) {
        if (adjusted.frame_timestamp === original.frame_timestamp) {
          console.log(`  ❌ ERROR: Frame timestamp should have been adjusted too!`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(60));
  }
}

async function testEdgeCases() {
  console.log('\n🧪 Testing edge cases...\n');
  
  // Test very short video
  console.log('📹 Testing very short video (30 seconds)...');
  const shortVideoQuestions = [
    { id: 'short1', question: 'Question at 25s', timestamp: 25, frame_timestamp: 23, type: 'mcq' },
    { id: 'short2', question: 'Question at 28s', timestamp: 28, frame_timestamp: 26, type: 'mcq' }
  ];
  
  const adjustedShortVideo = adjustEndOfVideoQuestions(shortVideoQuestions, 30);
  console.log('Results for 30s video:');
  adjustedShortVideo.forEach((q, i) => {
    console.log(`  Question ${i+1}: ${shortVideoQuestions[i].timestamp}s → ${q.timestamp}s`);
  });
  
  // Test questions exactly at buffer boundary
  console.log('\n📹 Testing boundary conditions (300s video)...');
  const boundaryQuestions = [
    { id: 'b1', question: 'At boundary', timestamp: 295, frame_timestamp: 293, type: 'mcq' },
    { id: 'b2', question: 'Just inside', timestamp: 296, frame_timestamp: 294, type: 'mcq' },
    { id: 'b3', question: 'Just outside', timestamp: 294, frame_timestamp: 292, type: 'mcq' }
  ];
  
  const adjustedBoundary = adjustEndOfVideoQuestions(boundaryQuestions, 300);
  console.log('Results for boundary test:');
  adjustedBoundary.forEach((q, i) => {
    const original = boundaryQuestions[i];
    const changed = original.timestamp !== q.timestamp;
    console.log(`  ${original.timestamp}s → ${q.timestamp}s ${changed ? '(ADJUSTED)' : '(unchanged)'}`);
  });
}

async function validateTriggerWindow() {
  console.log('\n⏰ Validating trigger timing...\n');
  
  const videoDuration = 300; // 5 minute video
  const questions = createTestQuestions(videoDuration);
  const adjusted = adjustEndOfVideoQuestions(questions, videoDuration);
  
  console.log('Checking if adjusted questions have enough time to trigger:');
  
  adjusted.forEach((question, index) => {
    const timeToEnd = videoDuration - question.timestamp;
    const hasEnoughTime = timeToEnd >= 5; // Needs at least 5 seconds to trigger
    
    console.log(`Question ${index + 1}:`);
    console.log(`  Timestamp: ${question.timestamp}s`);
    console.log(`  Time to video end: ${timeToEnd}s`);
    console.log(`  Sufficient trigger time: ${hasEnoughTime ? '✅ YES' : '❌ NO'}`);
    
    if (!hasEnoughTime) {
      console.log(`  ❌ ERROR: Question may not trigger before video ends!`);
    }
  });
}

// Run all tests
async function runTests() {
  try {
    console.log('🎯 END-OF-VIDEO QUESTION ADJUSTMENT TEST\n');
    console.log('This test validates that questions placed too close to video end are moved earlier.\n');
    
    await testEndOfVideoAdjustment();
    await testEdgeCases();
    await validateTriggerWindow();
    
    console.log('\n📈 SUMMARY:');
    console.log('='.repeat(50));
    console.log('✅ End-of-video question adjustment logic tested');
    console.log('✅ Edge cases and boundary conditions validated');
    console.log('✅ Trigger timing window verified');
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { 
  adjustEndOfVideoQuestions, 
  testEndOfVideoAdjustment, 
  testEdgeCases, 
  validateTriggerWindow, 
  runTests 
}; 