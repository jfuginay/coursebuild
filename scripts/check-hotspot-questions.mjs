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

// Check hotspot questions
const { data: hotspotQuestions } = await supabase
  .from('questions')
  .select('*')
  .eq('type', 'hotspot')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Hotspot Questions - Checking correct_answer values:');
console.log('===================================================\n');

hotspotQuestions?.forEach(q => {
  const isWrong = q.correct_answer !== 1;
  console.log(`ID: ${q.id}`);
  console.log(`  Question: ${q.question.substring(0, 60)}...`);
  console.log(`  Correct Answer: ${q.correct_answer} ${isWrong ? '❌ (should be 1)' : '✅'}`);
  console.log(`  Options: ${q.options}`);
  console.log(`  Frame Timestamp: ${q.frame_timestamp}`);
  console.log(`  Has Visual Asset: ${q.has_visual_asset}`);
  console.log(`  Created: ${q.created_at}`);
  console.log(`  Segment ID: ${q.segment_id}`);
  console.log('');
}); 
 
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

// Check hotspot questions
const { data: hotspotQuestions } = await supabase
  .from('questions')
  .select('*')
  .eq('type', 'hotspot')
  .order('created_at', { ascending: false })
  .limit(10);

console.log('Hotspot Questions - Checking correct_answer values:');
console.log('===================================================\n');

hotspotQuestions?.forEach(q => {
  const isWrong = q.correct_answer !== 1;
  console.log(`ID: ${q.id}`);
  console.log(`  Question: ${q.question.substring(0, 60)}...`);
  console.log(`  Correct Answer: ${q.correct_answer} ${isWrong ? '❌ (should be 1)' : '✅'}`);
  console.log(`  Options: ${q.options}`);
  console.log(`  Frame Timestamp: ${q.frame_timestamp}`);
  console.log(`  Has Visual Asset: ${q.has_visual_asset}`);
  console.log(`  Created: ${q.created_at}`);
  console.log(`  Segment ID: ${q.segment_id}`);
  console.log('');
}); 