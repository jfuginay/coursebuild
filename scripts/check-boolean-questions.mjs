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

// Check specific problematic questions
const problemIds = [
  '14ecef81-d5ca-4bf7-90bf-4f9d71e1074a', // true
  '9742b551-1f6d-41e0-a259-8e9aec7654b3', // false
  'e6f46d06-636c-466b-a24f-b4759b8fa769'  // false
];

const { data } = await supabase
  .from('questions')
  .select('*')
  .in('id', problemIds);

console.log('Questions with boolean correct_answer:');
console.log('=====================================\n');

data?.forEach(q => {
  console.log(`ID: ${q.id}`);
  console.log(`  Type: ${q.type}`);
  console.log(`  Question: ${q.question.substring(0, 60)}...`);
  console.log(`  Correct Answer: ${q.correct_answer} (type: ${typeof q.correct_answer})`);
  console.log(`  Options: ${q.options}`);
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

// Check specific problematic questions
const problemIds = [
  '14ecef81-d5ca-4bf7-90bf-4f9d71e1074a', // true
  '9742b551-1f6d-41e0-a259-8e9aec7654b3', // false
  'e6f46d06-636c-466b-a24f-b4759b8fa769'  // false
];

const { data } = await supabase
  .from('questions')
  .select('*')
  .in('id', problemIds);

console.log('Questions with boolean correct_answer:');
console.log('=====================================\n');

data?.forEach(q => {
  console.log(`ID: ${q.id}`);
  console.log(`  Type: ${q.type}`);
  console.log(`  Question: ${q.question.substring(0, 60)}...`);
  console.log(`  Correct Answer: ${q.correct_answer} (type: ${typeof q.correct_answer})`);
  console.log(`  Options: ${q.options}`);
  console.log(`  Created: ${q.created_at}`);
  console.log(`  Segment ID: ${q.segment_id}`);
  console.log('');
}); 