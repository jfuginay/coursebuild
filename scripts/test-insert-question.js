#!/usr/bin/env node

/**
 * Test script to manually insert a question and verify real-time works
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertTestQuestion(courseId) {
  console.log(`\n🧪 Inserting test question for course: ${courseId}\n`);
  
  const testQuestion = {
    course_id: courseId,
    type: 'multiple-choice',
    question: `Test Question at ${new Date().toISOString()}`,
    options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
    correct_answer: 0,
    explanation: 'This is a test question to verify real-time subscriptions',
    timestamp: Math.floor(Math.random() * 60), // Random timestamp between 0-60 seconds
    segment_index: 0
  };
  
  console.log('📝 Inserting question:', testQuestion);
  
  const { data, error } = await supabase
    .from('questions')
    .insert(testQuestion)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error inserting question:', error);
    return;
  }
  
  console.log('✅ Question inserted successfully:', {
    id: data.id,
    question: data.question,
    timestamp: data.timestamp
  });
  
  console.log('\n⚡ If real-time is working, you should see this question appear in the UI immediately.');
  console.log('🔍 Check the browser console for "📝 New question received via real-time"');
}

// Get course ID from command line arguments
const courseId = process.argv[2];

if (!courseId) {
  console.error('Usage: node test-insert-question.js <course-id>');
  console.error('Example: node test-insert-question.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

insertTestQuestion(courseId)
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 
 

/**
 * Test script to manually insert a question and verify real-time works
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertTestQuestion(courseId) {
  console.log(`\n🧪 Inserting test question for course: ${courseId}\n`);
  
  const testQuestion = {
    course_id: courseId,
    type: 'multiple-choice',
    question: `Test Question at ${new Date().toISOString()}`,
    options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
    correct_answer: 0,
    explanation: 'This is a test question to verify real-time subscriptions',
    timestamp: Math.floor(Math.random() * 60), // Random timestamp between 0-60 seconds
    segment_index: 0
  };
  
  console.log('📝 Inserting question:', testQuestion);
  
  const { data, error } = await supabase
    .from('questions')
    .insert(testQuestion)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error inserting question:', error);
    return;
  }
  
  console.log('✅ Question inserted successfully:', {
    id: data.id,
    question: data.question,
    timestamp: data.timestamp
  });
  
  console.log('\n⚡ If real-time is working, you should see this question appear in the UI immediately.');
  console.log('🔍 Check the browser console for "📝 New question received via real-time"');
}

// Get course ID from command line arguments
const courseId = process.argv[2];

if (!courseId) {
  console.error('Usage: node test-insert-question.js <course-id>');
  console.error('Example: node test-insert-question.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

insertTestQuestion(courseId)
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 