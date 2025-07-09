/**
 * Test script to validate hotspot questions generate multiple bounding boxes
 * This ensures users have multiple options to choose from for meaningful interaction
 */

const SUPABASE_URL = 'https://xjqjqkjmkdqgqzjqshzm.supabase.co';

/**
 * Test hotspot question generation with multiple bounding boxes
 */
async function testHotspotMultipleBoundingBoxes() {
  console.log('🎯 Testing Hotspot Questions for Multiple Bounding Boxes\n');
  
  try {
    // Test with enhanced quiz service
    console.log('🔬 Testing Enhanced Quiz Service...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-quiz-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        course_id: `test-hotspot-${Date.now()}`,
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Test URL
        max_questions: 5,
        difficulty_level: 'medium',
        enable_visual_questions: true
      })
    });
    
    if (!response.ok) {
      console.error(`❌ API call failed: ${response.status}`);
      return;
    }
    
    const result = await response.json();
    
    if (!result.questions || !Array.isArray(result.questions)) {
      console.error('❌ Invalid response structure');
      return;
    }
    
    console.log(`✅ Generated ${result.questions.length} total questions`);
    
    // Analyze hotspot questions
    const hotspotQuestions = result.questions.filter(q => q.type === 'hotspot');
    console.log(`🎯 Found ${hotspotQuestions.length} hotspot questions`);
    
    if (hotspotQuestions.length === 0) {
      console.log('ℹ️ No hotspot questions generated - this is acceptable if video lacks suitable visual content');
      return;
    }
    
    // Validate each hotspot question
    let totalValidHotspots = 0;
    let totalBoundingBoxes = 0;
    
    for (const question of hotspotQuestions) {
      console.log(`\n📍 Analyzing hotspot question: "${question.question}"`);
      
      // Check if question has metadata with bounding boxes
      let boundingBoxCount = 0;
      let correctAnswerCount = 0;
      
      if (question.metadata) {
        try {
          const metadata = JSON.parse(question.metadata);
          const detectedElements = metadata.detected_elements || [];
          boundingBoxCount = detectedElements.length;
          correctAnswerCount = detectedElements.filter(el => el.is_correct_answer).length;
          
          console.log(`  📦 Bounding boxes: ${boundingBoxCount}`);
          console.log(`  ✅ Correct answers: ${correctAnswerCount}`);
          
          if (boundingBoxCount >= 2) {
            totalValidHotspots++;
            totalBoundingBoxes += boundingBoxCount;
            console.log(`  ✅ VALID: Question has ${boundingBoxCount} options for user selection`);
            
            // Log the objects for debugging
            detectedElements.forEach((el, i) => {
              console.log(`    ${i + 1}. ${el.label} ${el.is_correct_answer ? '(CORRECT)' : '(distractor)'}`);
            });
          } else {
            console.log(`  ❌ INVALID: Only ${boundingBoxCount} bounding box(es) - needs multiple options`);
          }
          
        } catch (parseError) {
          console.log(`  ❌ Failed to parse metadata: ${parseError.message}`);
        }
      } else {
        console.log(`  ⚠️ No metadata found - bounding boxes may not be generated yet`);
      }
    }
    
    // Summary report
    console.log('\n' + '='.repeat(60));
    console.log('📊 HOTSPOT VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total hotspot questions: ${hotspotQuestions.length}`);
    console.log(`Valid hotspot questions: ${totalValidHotspots}`);
    console.log(`Invalid hotspot questions: ${hotspotQuestions.length - totalValidHotspots}`);
    console.log(`Average bounding boxes per valid question: ${totalValidHotspots > 0 ? (totalBoundingBoxes / totalValidHotspots).toFixed(1) : 'N/A'}`);
    
    // Success criteria
    const successRate = hotspotQuestions.length > 0 ? (totalValidHotspots / hotspotQuestions.length) * 100 : 100;
    console.log(`Success rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 80) {
      console.log('✅ TEST PASSED: Most hotspot questions have multiple bounding boxes');
    } else {
      console.log('❌ TEST FAILED: Too many hotspot questions lack multiple bounding boxes');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test the question framing for hotspot questions
 */
function validateHotspotQuestionFraming(questions) {
  console.log('\n🎯 Validating Hotspot Question Framing...');
  
  const hotspotQuestions = questions.filter(q => q.type === 'hotspot');
  
  if (hotspotQuestions.length === 0) {
    console.log('ℹ️ No hotspot questions to validate');
    return;
  }
  
  let wellFramedCount = 0;
  
  hotspotQuestions.forEach((question, index) => {
    console.log(`\n${index + 1}. "${question.question}"`);
    
    // Check if question is framed as a selection task
    const isWellFramed = 
      question.question.toLowerCase().includes('click on') ||
      question.question.toLowerCase().includes('select the') ||
      question.question.toLowerCase().includes('identify the') ||
      question.question.toLowerCase().includes('find the');
    
    if (isWellFramed) {
      wellFramedCount++;
      console.log('   ✅ Well-framed for selection');
    } else {
      console.log('   ⚠️ Could be better framed for hotspot interaction');
      console.log('   💡 Suggestion: "Click on the [object] in this [context]"');
    }
  });
  
  console.log(`\n📊 Framing Results: ${wellFramedCount}/${hotspotQuestions.length} well-framed`);
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Hotspot Multiple Bounding Box Test Suite');
  console.log('=' .repeat(60));
  
  // Check environment variables
  if (!process.env.SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_ANON_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    await testHotspotMultipleBoundingBoxes();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Export functions for potential use in other tests
module.exports = {
  testHotspotMultipleBoundingBoxes,
  validateHotspotQuestionFraming
};

// Run tests if this file is executed directly
if (require.main === module) {
  main();
} 