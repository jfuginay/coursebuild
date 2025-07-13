const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuestionTypes() {
  console.log('🧪 Testing Question Type Storage\n');
  
  // Get a recent course
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (courseError) {
    console.error('Error fetching courses:', courseError);
    return;
  }
  
  for (const course of courses) {
    console.log(`\n📚 Course: ${course.title}`);
    console.log(`   ID: ${course.id}`);
    
    // Get questions for this course
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', course.id)
      .order('timestamp', { ascending: true });
      
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      continue;
    }
    
    console.log(`   Total questions: ${questions.length}`);
    
    // Group by type
    const typeGroups = {};
    questions.forEach(q => {
      if (!typeGroups[q.type]) {
        typeGroups[q.type] = [];
      }
      typeGroups[q.type].push(q);
    });
    
    // Analyze each type
    for (const [type, typeQuestions] of Object.entries(typeGroups)) {
      console.log(`\n   📋 ${type.toUpperCase()} (${typeQuestions.length} questions):`);
      
      // Check a sample question
      const sample = typeQuestions[0];
      console.log(`      Sample question: "${sample.question.substring(0, 50)}..."`);
      
      // Type-specific checks
      switch (type) {
        case 'multiple-choice':
          // Check options format
          if (sample.options) {
            try {
              const parsedOptions = JSON.parse(sample.options);
              console.log(`      ✅ Options: ${parsedOptions.length} choices`);
              console.log(`      ✅ Correct answer index: ${sample.correct_answer}`);
            } catch (e) {
              console.log(`      ❌ Options parsing failed:`, sample.options);
            }
          } else {
            console.log(`      ❌ No options field`);
          }
          break;
          
        case 'true-false':
        case 'true_false':
          console.log(`      ✅ Correct answer: ${sample.correct_answer === 0 ? 'True' : 'False'} (index: ${sample.correct_answer})`);
          if (sample.options) {
            try {
              const parsedOptions = JSON.parse(sample.options);
              console.log(`      ✅ Options: ${parsedOptions.join(', ')}`);
            } catch (e) {
              console.log(`      ⚠️ Options stored as string: ${sample.options}`);
            }
          }
          break;
          
        case 'hotspot':
          console.log(`      ✅ Has visual asset: ${sample.has_visual_asset}`);
          console.log(`      ✅ Frame timestamp: ${sample.frame_timestamp}`);
          
          if (sample.metadata) {
            try {
              const metadata = JSON.parse(sample.metadata);
              console.log(`      ✅ Target objects: ${metadata.target_objects?.length || 0}`);
              console.log(`      ✅ Detected elements: ${metadata.detected_elements?.length || 0}`);
              console.log(`      ✅ Video overlay: ${metadata.video_overlay}`);
            } catch (e) {
              console.log(`      ❌ Metadata parsing failed`);
            }
          }
          
          // Check bounding boxes
          const { data: boxes, error: boxError } = await supabase
            .from('bounding_boxes')
            .select('*')
            .eq('question_id', sample.id);
            
          if (!boxError && boxes) {
            console.log(`      ✅ Bounding boxes in DB: ${boxes.length}`);
          } else {
            console.log(`      ⚠️ No bounding boxes found`);
          }
          break;
          
        case 'matching':
          if (sample.metadata) {
            try {
              const metadata = JSON.parse(sample.metadata);
              console.log(`      ✅ Matching pairs: ${metadata.matching_pairs?.length || 0}`);
              console.log(`      ✅ Relationship type: ${metadata.relationship_type || 'Not specified'}`);
              console.log(`      ✅ Video overlay: ${metadata.video_overlay}`);
            } catch (e) {
              console.log(`      ❌ Metadata parsing failed`);
            }
          }
          break;
          
        case 'sequencing':
          if (sample.metadata) {
            try {
              const metadata = JSON.parse(sample.metadata);
              console.log(`      ✅ Sequence items: ${metadata.sequence_items?.length || 0}`);
              console.log(`      ✅ Sequence type: ${metadata.sequence_type || 'Not specified'}`);
              console.log(`      ✅ Video overlay: ${metadata.video_overlay}`);
            } catch (e) {
              console.log(`      ❌ Metadata parsing failed`);
            }
          }
          break;
          
        default:
          console.log(`      ⚠️ Unknown question type: ${type}`);
      }
    }
  }
  
  console.log('\n✅ Test complete!');
}

testQuestionTypes().catch(console.error); 
 