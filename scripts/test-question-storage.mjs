import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyQuestionStorage() {
  console.log('🔍 Verifying Question Storage...\n');
  
  try {
    // Get recent questions of each type
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('Error fetching questions:', error);
      return;
    }
    
    console.log(`📊 Found ${questions.length} recent questions\n`);
    
    // Group by type
    const questionsByType = questions.reduce((acc, q) => {
      if (!acc[q.type]) acc[q.type] = [];
      acc[q.type].push(q);
      return acc;
    }, {});
    
    // Verify True-False Questions
    console.log('📝 TRUE-FALSE QUESTIONS:');
    console.log('=' .repeat(60));
    const trueFalseQuestions = questionsByType['true-false'] || [];
    
    if (trueFalseQuestions.length === 0) {
      console.log('No true-false questions found');
    } else {
      for (const q of trueFalseQuestions.slice(0, 3)) {
        console.log(`\nQuestion ID: ${q.id}`);
        console.log(`Question: ${q.question.substring(0, 80)}...`);
        console.log(`Options field: ${q.options}`);
        console.log(`Correct Answer: ${q.correct_answer} (${q.correct_answer === 0 ? 'True' : 'False'})`);
        
        // Verify correct answer format
        if (typeof q.correct_answer === 'boolean') {
          console.log(`❌ ISSUE: correct_answer is boolean (${q.correct_answer}), should be 0 or 1`);
        } else if (q.correct_answer !== 0 && q.correct_answer !== 1) {
          console.log(`❌ ISSUE: correct_answer is ${q.correct_answer}, should be 0 (True) or 1 (False)`);
        } else {
          console.log('✅ Correct answer format is valid');
        }
        
        // Check options field
        if (q.options !== null) {
          console.log(`❌ ISSUE: options should be null for true-false questions, but is: ${q.options}`);
        }
        
        // Check metadata
        if (q.metadata) {
          try {
            const metadata = JSON.parse(q.metadata);
            console.log('Metadata fields:', Object.keys(metadata).join(', '));
            if (metadata.concept_analysis) {
              console.log('✅ Has concept_analysis');
            }
            if (metadata.misconception_addressed) {
              console.log('✅ Has misconception_addressed');
            }
          } catch (e) {
            console.log('❌ Invalid metadata JSON');
          }
        }
      }
    }
    
    // Verify Hotspot Questions
    console.log('\n\n🎯 HOTSPOT QUESTIONS:');
    console.log('=' .repeat(60));
    const hotspotQuestions = questionsByType['hotspot'] || [];
    
    if (hotspotQuestions.length === 0) {
      console.log('No hotspot questions found');
    } else {
      for (const q of hotspotQuestions.slice(0, 3)) {
        console.log(`\nQuestion ID: ${q.id}`);
        console.log(`Question: ${q.question.substring(0, 80)}...`);
        console.log(`Options field: ${q.options}`);
        console.log(`Correct Answer: ${q.correct_answer}`);
        console.log(`Frame Timestamp: ${q.frame_timestamp}`);
        console.log(`Has Visual Asset: ${q.has_visual_asset}`);
        
        // Check metadata
        if (q.metadata) {
          try {
            const metadata = JSON.parse(q.metadata);
            console.log('Metadata fields:', Object.keys(metadata).join(', '));
            
            if (metadata.target_objects) {
              console.log(`Target Objects: ${metadata.target_objects.join(', ')}`);
            }
            
            if (metadata.detected_elements) {
              console.log(`✅ Has ${metadata.detected_elements.length} detected elements (bounding boxes)`);
            } else {
              console.log('❌ No detected_elements in metadata');
            }
            
            if (metadata.video_overlay) {
              console.log('✅ Has video_overlay flag');
            }
          } catch (e) {
            console.log('❌ Invalid metadata JSON');
          }
        }
        
        // Check bounding boxes
        const { data: boundingBoxes, error: bbError } = await supabase
          .from('bounding_boxes')
          .select('*')
          .eq('question_id', q.id);
          
        if (!bbError && boundingBoxes) {
          console.log(`📦 Bounding Boxes: ${boundingBoxes.length}`);
          if (boundingBoxes.length > 0) {
            const box = boundingBoxes[0];
            console.log(`  First box: ${box.label} at (${box.x}, ${box.y}), size: ${box.width}x${box.height}`);
            console.log(`  Is correct: ${box.is_correct_answer}`);
          }
        }
      }
    }
    
    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('=' .repeat(60));
    Object.entries(questionsByType).forEach(([type, questions]) => {
      console.log(`${type}: ${questions.length} questions`);
    });
    
    // Check for potential issues
    console.log('\n\n⚠️  POTENTIAL ISSUES:');
    console.log('=' .repeat(60));
    
    // Check true-false questions with wrong correct_answer values
    const problematicTrueFalse = trueFalseQuestions.filter(q => 
      typeof q.correct_answer === 'boolean' || (q.correct_answer !== 0 && q.correct_answer !== 1)
    );
    if (problematicTrueFalse.length > 0) {
      console.log(`❌ ${problematicTrueFalse.length} true-false questions with invalid correct_answer values`);
      problematicTrueFalse.forEach(q => {
        console.log(`   - Question ${q.id}: correct_answer = ${q.correct_answer}`);
      });
    }
    
    // Check hotspot questions without bounding boxes
    let hotspotWithoutBoxes = 0;
    for (const q of hotspotQuestions) {
      const { count } = await supabase
        .from('bounding_boxes')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', q.id);
        
      if (count === 0) {
        hotspotWithoutBoxes++;
      }
    }
    if (hotspotWithoutBoxes > 0) {
      console.log(`❌ ${hotspotWithoutBoxes} hotspot questions without bounding boxes`);
    }
    
    // Check questions with null/empty options that should have them
    const mcqWithoutOptions = questions.filter(q => 
      q.type === 'multiple-choice' && (!q.options || q.options === 'null' || q.options === '[]')
    );
    if (mcqWithoutOptions.length > 0) {
      console.log(`❌ ${mcqWithoutOptions.length} multiple-choice questions without options`);
    }
    
    if (problematicTrueFalse.length === 0 && hotspotWithoutBoxes === 0 && mcqWithoutOptions.length === 0) {
      console.log('✅ No issues found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyQuestionStorage(); 