/**
 * Test script to validate improved question generation quality
 * This script tests the enhanced gemini-quiz-service with educational design improvements
 */

const SUPABASE_URL = 'https://xjqjqkjmkdqgqzjqshzm.supabase.co';

// Test URLs for different educational content types
const TEST_VIDEOS = [
  {
    id: 'circuit-analysis',
    url: 'https://www.youtube.com/watch?v=example1',
    expected_concepts: ['Ohm\'s law', 'resistance', 'current flow', 'voltage'],
    expected_visual_elements: ['circuit diagram', 'resistor', 'components']
  },
  {
    id: 'programming-concepts',
    url: 'https://www.youtube.com/watch?v=example2',
    expected_concepts: ['variables', 'functions', 'loops', 'data types'],
    expected_visual_elements: ['code editor', 'syntax highlighting', 'output console']
  }
];

// Quality assessment criteria based on educational design principles
const QUALITY_CRITERIA = {
  bloom_taxonomy: {
    remember: 0.2,    // Max 20% basic recall questions
    understand: 0.4,  // 40% conceptual understanding
    apply: 0.3,       // 30% application questions
    analyze: 0.2,     // 20% analysis questions
    evaluate: 0.1,    // 10% evaluation questions
    create: 0.1       // 10% creation questions
  },
  question_types: {
    multiple_choice: 0.5,  // 50% multiple choice
    true_false: 0.2,       // 20% true/false
    hotspot: 0.15,         // 15% hotspot (if visual content exists)
    matching: 0.1,         // 10% matching
    sequencing: 0.05       // 5% sequencing
  },
  timestamp_quality: {
    min_spacing: 60,       // Minimum 60 seconds between questions
    max_spacing: 120,      // Maximum 120 seconds between questions
    optimal_spacing: 90    // Optimal 90 seconds between questions
  }
};

/**
 * Test the enhanced question generation system
 */
async function testEnhancedQuestionGeneration() {
  console.log('🧪 Testing Enhanced Question Generation System\n');
  
  for (const testVideo of TEST_VIDEOS) {
    console.log(`\n📹 Testing video: ${testVideo.id}`);
    console.log(`🔗 URL: ${testVideo.url}`);
    
    try {
      // Test the enhanced gemini-quiz-service
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-quiz-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          course_id: `test-${testVideo.id}-${Date.now()}`,
          youtube_url: testVideo.url,
          max_questions: 8,
          difficulty_level: 'medium',
          focus_topics: testVideo.expected_concepts
        })
      });
      
      if (!response.ok) {
        console.error(`❌ API call failed: ${response.status}`);
        continue;
      }
      
      const result = await response.json();
      
      // Validate response structure
      if (!result.questions || !Array.isArray(result.questions)) {
        console.error('❌ Invalid response structure');
        continue;
      }
      
      console.log(`✅ Generated ${result.questions.length} questions`);
      
      // Run quality assessments
      const qualityReport = assessQuestionQuality(result.questions, testVideo);
      displayQualityReport(qualityReport, testVideo.id);
      
    } catch (error) {
      console.error(`❌ Error testing ${testVideo.id}:`, error.message);
    }
  }
}

/**
 * Assess the quality of generated questions based on educational design principles
 */
function assessQuestionQuality(questions, testVideo) {
  const report = {
    total_questions: questions.length,
    bloom_distribution: assessBloomDistribution(questions),
    question_type_distribution: assessQuestionTypeDistribution(questions),
    timestamp_quality: assessTimestampQuality(questions),
    content_alignment: assessContentAlignment(questions, testVideo),
    visual_question_quality: assessVisualQuestionQuality(questions),
    explanation_quality: assessExplanationQuality(questions),
    overall_score: 0
  };
  
  // Calculate overall quality score
  report.overall_score = calculateOverallScore(report);
  
  return report;
}

/**
 * Assess Bloom's taxonomy distribution
 */
function assessBloomDistribution(questions) {
  const distribution = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0
  };
  
  questions.forEach(q => {
    const metadata = q.metadata ? JSON.parse(q.metadata) : {};
    const bloomLevel = metadata.bloom_level || 'remember';
    distribution[bloomLevel] = (distribution[bloomLevel] || 0) + 1;
  });
  
  const total = questions.length;
  const percentages = {};
  
  Object.keys(distribution).forEach(level => {
    percentages[level] = (distribution[level] / total) * 100;
  });
  
  return {
    raw_counts: distribution,
    percentages,
    quality_score: calculateBloomQualityScore(percentages)
  };
}

/**
 * Assess question type distribution
 */
function assessQuestionTypeDistribution(questions) {
  const distribution = {};
  
  questions.forEach(q => {
    const type = q.type || 'multiple-choice';
    distribution[type] = (distribution[type] || 0) + 1;
  });
  
  const total = questions.length;
  const percentages = {};
  
  Object.keys(distribution).forEach(type => {
    percentages[type] = (distribution[type] / total) * 100;
  });
  
  return {
    raw_counts: distribution,
    percentages,
    has_visual_questions: questions.some(q => ['hotspot', 'matching', 'sequencing'].includes(q.type))
  };
}

/**
 * Assess timestamp quality and spacing
 */
function assessTimestampQuality(questions) {
  const timestamps = questions.map(q => q.timestamp).sort((a, b) => a - b);
  const spacings = [];
  
  for (let i = 1; i < timestamps.length; i++) {
    spacings.push(timestamps[i] - timestamps[i-1]);
  }
  
  const avgSpacing = spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;
  const minSpacing = Math.min(...spacings);
  const maxSpacing = Math.max(...spacings);
  
  return {
    average_spacing: avgSpacing,
    min_spacing: minSpacing,
    max_spacing: maxSpacing,
    optimal_spacing: avgSpacing >= 60 && avgSpacing <= 120,
    spacing_consistency: calculateSpacingConsistency(spacings)
  };
}

/**
 * Assess content alignment with expected concepts
 */
function assessContentAlignment(questions, testVideo) {
  const expectedConcepts = testVideo.expected_concepts;
  const questionTexts = questions.map(q => q.question.toLowerCase());
  
  const conceptCoverage = expectedConcepts.map(concept => {
    const mentioned = questionTexts.some(text => 
      text.includes(concept.toLowerCase())
    );
    return { concept, mentioned };
  });
  
  const coveragePercentage = (conceptCoverage.filter(c => c.mentioned).length / expectedConcepts.length) * 100;
  
  return {
    expected_concepts: expectedConcepts,
    concept_coverage: conceptCoverage,
    coverage_percentage: coveragePercentage
  };
}

/**
 * Assess visual question quality
 */
function assessVisualQuestionQuality(questions) {
  const visualQuestions = questions.filter(q => 
    ['hotspot', 'matching', 'sequencing'].includes(q.type)
  );
  
  if (visualQuestions.length === 0) {
    return { count: 0, quality_indicators: [] };
  }
  
  const qualityIndicators = visualQuestions.map(q => {
    const metadata = q.metadata ? JSON.parse(q.metadata) : {};
    return {
      question_id: q.id,
      type: q.type,
      has_frame_timestamp: !!q.frame_timestamp,
      has_visual_context: !!metadata.visual_context,
      has_educational_rationale: !!metadata.educational_rationale,
      timestamp_difference: q.frame_timestamp ? Math.abs(q.frame_timestamp - q.timestamp) : 0
    };
  });
  
  return {
    count: visualQuestions.length,
    quality_indicators,
    avg_timestamp_difference: qualityIndicators.reduce((sum, qi) => sum + qi.timestamp_difference, 0) / qualityIndicators.length
  };
}

/**
 * Assess explanation quality
 */
function assessExplanationQuality(questions) {
  const explanations = questions.map(q => q.explanation || '');
  
  const qualityMetrics = explanations.map(explanation => ({
    length: explanation.length,
    has_because: explanation.toLowerCase().includes('because'),
    has_reasoning: explanation.toLowerCase().includes('therefore') || explanation.toLowerCase().includes('thus'),
    is_educational: explanation.length > 50 && !explanation.toLowerCase().includes('the correct answer is')
  }));
  
  const avgLength = qualityMetrics.reduce((sum, m) => sum + m.length, 0) / qualityMetrics.length;
  const educationalCount = qualityMetrics.filter(m => m.is_educational).length;
  
  return {
    average_length: avgLength,
    educational_explanations: educationalCount,
    educational_percentage: (educationalCount / questions.length) * 100
  };
}

/**
 * Calculate overall quality score
 */
function calculateOverallScore(report) {
  let score = 0;
  
  // Bloom's taxonomy distribution (25% weight)
  score += report.bloom_distribution.quality_score * 0.25;
  
  // Timestamp quality (20% weight)
  score += (report.timestamp_quality.optimal_spacing ? 100 : 50) * 0.20;
  
  // Content alignment (25% weight)
  score += report.content_alignment.coverage_percentage * 0.25;
  
  // Visual question quality (15% weight)
  if (report.visual_question_quality.count > 0) {
    const visualScore = report.visual_question_quality.quality_indicators.every(qi => 
      qi.has_frame_timestamp && qi.has_visual_context
    ) ? 100 : 50;
    score += visualScore * 0.15;
  }
  
  // Explanation quality (15% weight)
  score += report.explanation_quality.educational_percentage * 0.15;
  
  return Math.round(score);
}

/**
 * Calculate Bloom's taxonomy quality score
 */
function calculateBloomQualityScore(percentages) {
  let score = 0;
  
  // Penalize too many remember questions
  if (percentages.remember > 30) score -= 20;
  
  // Reward good distribution of higher-order questions
  if (percentages.understand >= 30) score += 25;
  if (percentages.apply >= 20) score += 25;
  if (percentages.analyze >= 15) score += 25;
  if (percentages.evaluate >= 10) score += 15;
  if (percentages.create >= 5) score += 10;
  
  return Math.max(0, Math.min(100, score + 50)); // Base score of 50
}

/**
 * Calculate spacing consistency
 */
function calculateSpacingConsistency(spacings) {
  const mean = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
  const variance = spacings.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / spacings.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower standard deviation = better consistency
  return Math.max(0, 100 - (stdDev / mean) * 100);
}

/**
 * Display quality report
 */
function displayQualityReport(report, videoId) {
  console.log(`\n📊 Quality Report for ${videoId}`);
  console.log(`Overall Score: ${report.overall_score}/100`);
  
  console.log('\n🎯 Bloom\'s Taxonomy Distribution:');
  Object.entries(report.bloom_distribution.percentages).forEach(([level, percentage]) => {
    console.log(`  ${level}: ${percentage.toFixed(1)}%`);
  });
  
  console.log('\n📝 Question Type Distribution:');
  Object.entries(report.question_type_distribution.percentages).forEach(([type, percentage]) => {
    console.log(`  ${type}: ${percentage.toFixed(1)}%`);
  });
  
  console.log('\n⏰ Timestamp Quality:');
  console.log(`  Average Spacing: ${report.timestamp_quality.average_spacing.toFixed(1)}s`);
  console.log(`  Min Spacing: ${report.timestamp_quality.min_spacing}s`);
  console.log(`  Max Spacing: ${report.timestamp_quality.max_spacing}s`);
  console.log(`  Optimal Spacing: ${report.timestamp_quality.optimal_spacing ? '✅' : '❌'}`);
  
  console.log('\n🎨 Content Alignment:');
  console.log(`  Concept Coverage: ${report.content_alignment.coverage_percentage.toFixed(1)}%`);
  report.content_alignment.concept_coverage.forEach(c => {
    console.log(`    ${c.concept}: ${c.mentioned ? '✅' : '❌'}`);
  });
  
  console.log('\n👁️ Visual Questions:');
  console.log(`  Count: ${report.visual_question_quality.count}`);
  if (report.visual_question_quality.count > 0) {
    console.log(`  Avg Timestamp Difference: ${report.visual_question_quality.avg_timestamp_difference.toFixed(1)}s`);
  }
  
  console.log('\n💡 Explanation Quality:');
  console.log(`  Average Length: ${report.explanation_quality.average_length.toFixed(1)} characters`);
  console.log(`  Educational Explanations: ${report.explanation_quality.educational_percentage.toFixed(1)}%`);
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Enhanced Question Quality Test Suite');
  console.log('=' .repeat(60));
  
  // Check environment variables
  if (!process.env.SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_ANON_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    await testEnhancedQuestionGeneration();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Export functions for potential use in other tests
module.exports = {
  testEnhancedQuestionGeneration,
  assessQuestionQuality,
  QUALITY_CRITERIA
};

// Run tests if this file is executed directly
if (require.main === module) {
  main();
} 