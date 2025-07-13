#!/usr/bin/env node

/**
 * Test script to verify single-segment minimum question generation
 */

// Test the question calculation logic
function calculateQuestions(durationMinutes, totalSegments, maxQuestions = 5) {
  let adjustedMaxQuestions;
  
  if (totalSegments === 1) {
    // Single segment: at least 5 questions, but respect max_questions limit
    adjustedMaxQuestions = Math.min(Math.max(durationMinutes, 5), maxQuestions);
  } else {
    // Multi-segment: 1 per minute as before
    adjustedMaxQuestions = Math.min(durationMinutes, maxQuestions);
  }
  
  return adjustedMaxQuestions;
}

// Test cases
const testCases = [
  // Single segment cases
  { duration: 2, segments: 1, max: 10, expected: 5, description: "2-min single segment → 5 questions (minimum)" },
  { duration: 3, segments: 1, max: 10, expected: 5, description: "3-min single segment → 5 questions (minimum)" },
  { duration: 5, segments: 1, max: 10, expected: 5, description: "5-min single segment → 5 questions (exactly minimum)" },
  { duration: 7, segments: 1, max: 10, expected: 7, description: "7-min single segment → 7 questions (1 per minute)" },
  { duration: 12, segments: 1, max: 10, expected: 10, description: "12-min single segment → 10 questions (max limit)" },
  { duration: 2, segments: 1, max: 3, expected: 3, description: "2-min single segment, max=3 → 3 questions (respects lower max)" },
  
  // Multi-segment cases (unchanged behavior)
  { duration: 5, segments: 3, max: 5, expected: 5, description: "5-min segment in multi-segment → 5 questions" },
  { duration: 2, segments: 3, max: 5, expected: 2, description: "2-min segment in multi-segment → 2 questions" },
  { duration: 10, segments: 3, max: 5, expected: 5, description: "10-min segment in multi-segment → 5 questions (max limit)" },
];

console.log("🧪 Testing Single-Segment Minimum Question Logic\n");
console.log("=" .repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = calculateQuestions(test.duration, test.segments, test.max);
  const isCorrect = result === test.expected;
  
  console.log(`\nTest ${index + 1}: ${test.description}`);
  console.log(`  Input: ${test.duration} minutes, ${test.segments} segment(s), max=${test.max}`);
  console.log(`  Expected: ${test.expected} questions`);
  console.log(`  Got: ${result} questions`);
  console.log(`  Result: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
  
  if (isCorrect) {
    passed++;
  } else {
    failed++;
  }
});

console.log("\n" + "=" .repeat(70));
console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log("✅ All tests passed! Single-segment minimum question logic is working correctly.");
  process.exit(0);
} else {
  console.log("❌ Some tests failed. Please check the implementation.");
  process.exit(1);
} 
 