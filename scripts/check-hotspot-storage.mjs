import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkHotspotQuestions() {
  console.log('🔍 Checking Hotspot Question Storage Differences\n');
  
  // Get recent hotspot questions
  const { data: hotspotQuestions, error } = await supabase
    .from('questions')
    .select(`
      *,
      bounding_boxes!inner (*)
    `)
    .eq('type', 'hotspot')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching hotspot questions:', error);
    return;
  }
  
  console.log(`Found ${hotspotQuestions.length} hotspot questions\n`);
  
  for (const question of hotspotQuestions) {
    console.log(`\n📍 Question ID: ${question.id}`);
    console.log(`Created: ${question.created_at}`);
    console.log(`Course ID: ${question.course_id}`);
    
    // Parse metadata
    if (question.metadata) {
      try {
        const metadata = JSON.parse(question.metadata);
        console.log('\n📦 Metadata:');
        console.log('- target_objects:', metadata.target_objects);
        console.log('- frame_timestamp:', metadata.frame_timestamp);
        console.log('- has detected_elements:', !!metadata.detected_elements);
        console.log('- gemini_bounding_boxes:', metadata.gemini_bounding_boxes);
        
        if (metadata.detected_elements) {
          console.log('\n🎯 Detected Elements in Metadata:');
          metadata.detected_elements.forEach((elem, idx) => {
            console.log(`  ${idx + 1}. ${elem.label || 'No label'}`);
            console.log(`     - Correct: ${elem.is_correct_answer}`);
            console.log(`     - Position: (${elem.x}, ${elem.y})`);
            console.log(`     - Size: ${elem.width} x ${elem.height}`);
            console.log(`     - Confidence: ${elem.confidence_score || 'N/A'}`);
          });
        }
      } catch (e) {
        console.log('❌ Failed to parse metadata:', e.message);
      }
    }
    
    // Check bounding boxes
    if (question.bounding_boxes && question.bounding_boxes.length > 0) {
      console.log(`\n📦 Bounding Boxes (${question.bounding_boxes.length} total):`);
      question.bounding_boxes.forEach((box, idx) => {
        console.log(`  ${idx + 1}. ${box.label}`);
        console.log(`     - ID: ${box.id}`);
        console.log(`     - Correct: ${box.is_correct_answer}`);
        console.log(`     - Position: (${box.x}, ${box.y})`);
        console.log(`     - Size: ${box.width} x ${box.height}`);
        console.log(`     - Confidence: ${box.confidence_score}`);
        console.log(`     - Visual Asset ID: ${box.visual_asset_id || 'null'}`);
      });
    } else {
      console.log('\n⚠️  No bounding boxes found in database!');
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  // Check for field mapping issues
  console.log('\n🔍 Checking for Field Mapping Issues...\n');
  
  const { data: recentBboxes, error: bboxError } = await supabase
    .from('bounding_boxes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (!bboxError && recentBboxes) {
    // Check for incorrect field values
    const withNullConfidence = recentBboxes.filter(b => b.confidence_score === null);
    const withZeroNineConfidence = recentBboxes.filter(b => b.confidence_score === 0.9);
    const withOtherConfidence = recentBboxes.filter(b => b.confidence_score !== null && b.confidence_score !== 0.9);
    
    console.log(`Confidence Score Analysis (last 20 bounding boxes):`);
    console.log(`- NULL confidence: ${withNullConfidence.length}`);
    console.log(`- 0.9 confidence (default): ${withZeroNineConfidence.length}`);
    console.log(`- Other confidence values: ${withOtherConfidence.length}`);
    
    if (withOtherConfidence.length > 0) {
      console.log('\nUnique confidence scores:', [...new Set(withOtherConfidence.map(b => b.confidence_score))]);
    }
  }
}

checkHotspotQuestions().catch(console.error); 