#!/usr/bin/env node

/**
 * Script to verify the publishing fix - checks courses and their question counts
 * Usage: node scripts/verify-publishing-fix.js
 */

// Try to load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('⚠️  Note: dotenv not found, reading from process.env only');
}

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   process.env.SUPABASE_ANON_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPublishingFix() {
  try {
    console.log('🔍 Verifying Publishing Fix...\n');
    
    // Get all courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, published, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (coursesError) {
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }
    
    console.log(`Found ${courses.length} recent courses\n`);
    
    // Check each course
    let publishedWithoutQuestions = 0;
    let publishedWithQuestions = 0;
    let unpublishedCourses = 0;
    
    for (const course of courses) {
      // Count questions for this course
      const { count: questionCount, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);
      
      if (countError) {
        console.error(`Failed to count questions for course ${course.id}:`, countError);
        continue;
      }
      
      const status = course.published ? '✅ Published' : '⏸️  Unpublished';
      const hasQuestions = questionCount > 0;
      const emoji = hasQuestions ? '📚' : '❌';
      
      console.log(`${status} | ${emoji} ${questionCount} questions | ${course.title.substring(0, 50)}...`);
      
      // Track statistics
      if (course.published && questionCount === 0) {
        publishedWithoutQuestions++;
        console.log(`   ⚠️  WARNING: Published course has NO questions!`);
      } else if (course.published && questionCount > 0) {
        publishedWithQuestions++;
      } else if (!course.published) {
        unpublishedCourses++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Published with questions: ${publishedWithQuestions}`);
    console.log(`   ❌ Published WITHOUT questions: ${publishedWithoutQuestions}`);
    console.log(`   ⏸️  Unpublished: ${unpublishedCourses}`);
    
    if (publishedWithoutQuestions > 0) {
      console.log('\n⚠️  ISSUE DETECTED: Some courses are published without questions!');
      console.log('   This indicates the fix may not be working properly.');
    } else {
      console.log('\n✅ All published courses have questions!');
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyPublishingFix(); 