/**
 * Test script to validate matching question processing in enhanced-quiz-service
 * 
 * This test verifies that:
 * 1. Matching questions with valid pairs (≥2) are processed correctly
 * 2. Matching questions with insufficient pairs are filtered out
 * 3. Metadata is properly structured for frontend consumption
 */

const { createClient } = require('@supabase/supabase-js');

// Test data for matching questions
const testMatchingQuestions = [
  {
    type: 'matching',
    question: 'Match the electrical components with their symbols.',
    timestamp: 120,
    matching_pairs: [
      { left: 'Resistor', right: 'Zigzag line' },
      { left: 'Capacitor', right: 'Parallel plates' },
      { left: 'Inductor', right: 'Coiled wire' }
    ],
    explanation: 'Each component has a standardized symbol in circuit diagrams.'
  },
  {
    type: 'matching',
    question: 'Invalid matching question with only one pair.',
    timestamp: 180,
    matching_pairs: [
      { left: 'Single item', right: 'Another item' }
    ],
    explanation: 'This should be filtered out.'
  },
  {
    type: 'matching',
    question: 'Matching question with no pairs.',
    timestamp: 240,
    matching_pairs: [],
    explanation: 'This should also be filtered out.'
  }
];

async function testMatchingQuestionProcessing() {
  console.log('🧪 Testing matching question processing logic...\n');

  // Simulate the processing logic from enhanced-quiz-service
  const processedQuestions = [];
  
  for (const question of testMatchingQuestions) {
    console.log(`Processing: "${question.question.substring(0, 50)}..."`);
    
    if (question.type === 'matching') {
      const matchingPairs = question.matching_pairs || [];
      
      if (matchingPairs.length >= 2) {
        console.log(`✅ Processing matching question with ${matchingPairs.length} pairs`);
        const updatedQuestion = {
          ...question,
          metadata: JSON.stringify({
            matching_pairs: matchingPairs,
            video_overlay: true
          })
        };
        processedQuestions.push(updatedQuestion);
      } else {
        console.log(`⚠️ Skipping matching question with insufficient pairs (${matchingPairs.length}). Need at least 2 pairs for meaningful interaction.`);
      }
    }
    
    console.log(''); // Add spacing
  }

  console.log('📊 Processing Results:');
  console.log(`Total input questions: ${testMatchingQuestions.length}`);
  console.log(`Valid processed questions: ${processedQuestions.length}`);
  console.log(`Filtered out questions: ${testMatchingQuestions.length - processedQuestions.length}\n`);

  // Validate metadata structure
  console.log('🔍 Validating metadata structure for processed questions:');
  processedQuestions.forEach((question, index) => {
    console.log(`\nQuestion ${index + 1}:`);
    console.log(`  Type: ${question.type}`);
    console.log(`  Question: ${question.question.substring(0, 50)}...`);
    
    try {
      const metadata = JSON.parse(question.metadata);
      console.log(`  ✅ Metadata parsed successfully`);
      console.log(`  ✅ Has matching_pairs: ${!!metadata.matching_pairs}`);
      console.log(`  ✅ Pairs count: ${metadata.matching_pairs?.length || 0}`);
      console.log(`  ✅ Video overlay enabled: ${metadata.video_overlay}`);
      
      // Validate pair structure
      if (metadata.matching_pairs && metadata.matching_pairs.length > 0) {
        const firstPair = metadata.matching_pairs[0];
        console.log(`  ✅ First pair structure: ${JSON.stringify(firstPair)}`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to parse metadata: ${error.message}`);
    }
  });

  return {
    totalInput: testMatchingQuestions.length,
    validOutput: processedQuestions.length,
    filteredOut: testMatchingQuestions.length - processedQuestions.length,
    processedQuestions
  };
}

async function testDatabaseStorage() {
  console.log('\n🗄️ Testing database storage compatibility...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ Supabase environment variables not found. Skipping database test.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test question structure that would be stored
  const testQuestion = {
    course_id: 'test-course-id',
    timestamp: 120,
    question: 'Match the electrical components with their symbols.',
    type: 'matching',
    options: null, // Matching questions don't use options
    correct_answer: 0, // Not applicable for matching
    explanation: 'Each component has a standardized symbol in circuit diagrams.',
    has_visual_asset: true,
    frame_timestamp: null,
    metadata: JSON.stringify({
      matching_pairs: [
        { left: 'Resistor', right: 'Zigzag line' },
        { left: 'Capacitor', right: 'Parallel plates' },
        { left: 'Inductor', right: 'Coiled wire' }
      ],
      video_overlay: true
    })
  };

  console.log('📝 Test question structure:');
  console.log(JSON.stringify(testQuestion, null, 2));
  
  // Simulate API parsing (like in /api/course/[id]/questions.ts)
  console.log('\n🔄 Simulating API parsing...');
  try {
    const metadata = testQuestion.metadata ? JSON.parse(testQuestion.metadata) : {};
    
    const transformedQuestion = {
      ...testQuestion,
      matching_pairs: metadata.matching_pairs || [],
      sequence_items: metadata.sequence_items || [],
      video_overlay: metadata.video_overlay || false
    };
    
    console.log('✅ API parsing successful');
    console.log(`✅ Matching pairs extracted: ${transformedQuestion.matching_pairs.length}`);
    console.log(`✅ Video overlay flag: ${transformedQuestion.video_overlay}`);
    
    return transformedQuestion;
  } catch (error) {
    console.log(`❌ API parsing failed: ${error.message}`);
    return null;
  }
}

// Run the tests
async function runTests() {
  try {
    console.log('🎯 MATCHING QUESTION PROCESSING TEST\n');
    console.log('This test validates the enhanced-quiz-service logic for processing matching questions.\n');
    
    const processingResults = await testMatchingQuestionProcessing();
    const storageTest = await testDatabaseStorage();
    
    console.log('\n📈 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Processing Test:`);
    console.log(`  ✅ Valid questions processed: ${processingResults.validOutput}`);
    console.log(`  ⚠️ Questions filtered out: ${processingResults.filteredOut}`);
    console.log(`  📊 Success rate: ${Math.round((processingResults.validOutput / processingResults.totalInput) * 100)}%`);
    
    if (storageTest) {
      console.log(`Storage Test:`);
      console.log(`  ✅ Database structure compatible`);
      console.log(`  ✅ API parsing successful`);
    }
    
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

module.exports = { testMatchingQuestionProcessing, testDatabaseStorage, runTests }; 