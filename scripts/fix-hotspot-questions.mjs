import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixHotspotQuestions() {
  console.log('🔧 Fixing Hotspot Questions with incorrect bounding boxes\n');
  
  // Get all hotspot questions
  const { data: hotspotQuestions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('type', 'hotspot')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching hotspot questions:', error);
    return;
  }
  
  console.log(`Found ${hotspotQuestions.length} hotspot questions to check\n`);
  
  let fixedCount = 0;
  
  for (const question of hotspotQuestions) {
    if (!question.metadata) continue;
    
    try {
      const metadata = JSON.parse(question.metadata);
      
      // Check if metadata has detected_elements
      if (!metadata.detected_elements || !Array.isArray(metadata.detected_elements)) {
        continue;
      }
      
      // Get bounding boxes for this question
      const { data: bboxes, error: bboxError } = await supabase
        .from('bounding_boxes')
        .select('*')
        .eq('question_id', question.id)
        .order('created_at', { ascending: true });
        
      if (bboxError || !bboxes || bboxes.length === 0) {
        continue;
      }
      
      // Check if any bounding box is marked as correct
      const hasCorrectAnswer = bboxes.some(b => b.is_correct_answer === true);
      
      if (!hasCorrectAnswer) {
        console.log(`\n🔍 Question ${question.id} needs fixing`);
        console.log(`Question: ${question.question.substring(0, 60)}...`);
        
        // Find correct answer from metadata
        const correctElements = metadata.detected_elements.filter(elem => elem.is_correct_answer === true);
        
        if (correctElements.length > 0) {
          console.log(`Found ${correctElements.length} correct answer(s) in metadata`);
          
          // Update bounding boxes based on metadata
          for (const correctElem of correctElements) {
            // Find matching bounding box by label and position
            const matchingBox = bboxes.find(bbox => 
              bbox.label === correctElem.label &&
              Math.abs(bbox.x - correctElem.x) < 0.01 &&
              Math.abs(bbox.y - correctElem.y) < 0.01
            );
            
            if (matchingBox) {
              console.log(`  ✅ Updating bounding box: ${matchingBox.label}`);
              
              const { error: updateError } = await supabase
                .from('bounding_boxes')
                .update({ 
                  is_correct_answer: true,
                  confidence_score: correctElem.confidence_score || matchingBox.confidence_score
                })
                .eq('id', matchingBox.id);
                
              if (updateError) {
                console.error(`  ❌ Failed to update: ${updateError.message}`);
              } else {
                fixedCount++;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error processing question ${question.id}:`, e.message);
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} bounding boxes`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixHotspotQuestions().catch(console.error);
}

export { fixHotspotQuestions }; 