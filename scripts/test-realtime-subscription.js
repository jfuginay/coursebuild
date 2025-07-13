#!/usr/bin/env node

/**
 * Test script to verify real-time subscriptions are working
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test course ID - change this to a course that's currently processing
const TEST_COURSE_ID = process.argv[2];

if (!TEST_COURSE_ID) {
  console.error('Please provide a course ID as argument: node test-realtime-subscription.js <course-id>');
  process.exit(1);
}

console.log(`🔍 Testing real-time subscription for course: ${TEST_COURSE_ID}`);

// Track received questions
const receivedQuestions = new Map();
let subscriptionActive = false;

// Subscribe to question inserts
const questionChannel = supabase
  .channel(`questions_${TEST_COURSE_ID}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'questions',
      filter: `course_id=eq.${TEST_COURSE_ID}`
    },
    (payload) => {
      console.log('\n📝 New question received via real-time:', new Date().toISOString());
      console.log('Question details:', {
        id: payload.new.id,
        question: payload.new.question.substring(0, 50) + '...',
        type: payload.new.type,
        timestamp: payload.new.timestamp,
        segment_index: payload.new.segment_index,
        course_id: payload.new.course_id
      });
      
      receivedQuestions.set(payload.new.id, payload.new);
      console.log(`✅ Total questions received: ${receivedQuestions.size}`);
    }
  )
  .subscribe((status) => {
    console.log('📡 Question channel subscription status:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to question updates');
      subscriptionActive = true;
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Error subscribing to question updates');
    } else if (status === 'TIMED_OUT') {
      console.error('⏰ Subscription timed out');
    }
  });

// Subscribe to segment updates
const segmentChannel = supabase
  .channel(`course_segments_${TEST_COURSE_ID}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'course_segments',
      filter: `course_id=eq.${TEST_COURSE_ID}`
    },
    (payload) => {
      console.log('\n📊 Segment update received:', new Date().toISOString());
      console.log('Segment details:', {
        segment_index: payload.new.segment_index,
        status: payload.new.status,
        questions_count: payload.new.questions_count,
        planned_questions_count: payload.new.planned_questions_count
      });
    }
  )
  .subscribe((status) => {
    console.log('📡 Segment channel subscription status:', status);
  });

// Check course status
async function checkCourseStatus() {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*, course_segments(*)') 
    .eq('id', TEST_COURSE_ID)
    .single();
    
  if (error) {
    console.error('Error fetching course:', error);
    return;
  }
  
  console.log('\n📋 Course Status:');
  console.log('- Published:', course.published);
  console.log('- Is Segmented:', course.is_segmented);
  console.log('- Total Segments:', course.total_segments);
  
  if (course.course_segments) {
    console.log('- Segments:', course.course_segments.map(s => ({
      index: s.segment_index,
      status: s.status,
      questions: s.questions_count
    })));
  }
  
  // Also check current questions
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, segment_index, timestamp')
    .eq('course_id', TEST_COURSE_ID)
    .order('timestamp', { ascending: true });
    
  if (!qError) {
    console.log(`- Total questions in DB: ${questions.length}`);
    console.log(`- Questions received via real-time: ${receivedQuestions.size}`);
    
    if (questions.length > receivedQuestions.size) {
      console.log('⚠️  Some questions were not received via real-time!');
      const missedQuestions = questions.filter(q => !receivedQuestions.has(q.id));
      console.log(`Missed ${missedQuestions.length} questions:`, missedQuestions.map(q => ({
        id: q.id,
        segment: q.segment_index,
        timestamp: q.timestamp
      })));
    }
  }
}

// Initial status check
setTimeout(() => {
  checkCourseStatus();
}, 2000);

// Periodic status checks
const statusInterval = setInterval(() => {
  checkCourseStatus();
}, 10000);

// Keep the script running
console.log('👀 Watching for real-time updates... Press Ctrl+C to stop');
console.log('Note: Make sure questions are being generated for this course!');

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🔌 Cleaning up subscriptions...');
  supabase.removeChannel(questionChannel);
  supabase.removeChannel(segmentChannel);
  clearInterval(statusInterval);
  process.exit(0);
}); 