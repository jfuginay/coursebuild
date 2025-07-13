#!/usr/bin/env node

/**
 * Script to fix courses that were published without questions
 * Usage: node scripts/fix-already-published.js [--dry-run]
 */

// Try to load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('⚠️  Note: dotenv not found, reading from process.env only');
}

const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
}

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

async function fixPublishedWithoutQuestions() {
  try {
    console.log('🔧 Fixing Published Courses Without Questions...\n');
    
    // Get all published courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, published')
      .eq('published', true);
    
    if (coursesError) {
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }
    
    console.log(`Found ${courses.length} published courses\n`);
    
    let coursesToFix = [];
    
    // Check each course for questions
    for (const course of courses) {
      const { count: questionCount, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);
      
      if (countError) {
        console.error(`Failed to count questions for course ${course.id}:`, countError);
        continue;
      }
      
      if (questionCount === 0) {
        coursesToFix.push(course);
        console.log(`❌ No questions: ${course.title.substring(0, 50)}...`);
      } else {
        console.log(`✅ ${questionCount} questions: ${course.title.substring(0, 50)}...`);
      }
    }
    
    if (coursesToFix.length === 0) {
      console.log('\n✅ All published courses have questions! No fixes needed.');
      return;
    }
    
    console.log(`\n⚠️  Found ${coursesToFix.length} courses to fix\n`);
    
    if (isDryRun) {
      console.log('DRY RUN - Would unpublish these courses:');
      coursesToFix.forEach(course => {
        console.log(`   - ${course.title}`);
      });
      console.log('\nRun without --dry-run to apply fixes');
      return;
    }
    
    // Unpublish courses without questions
    console.log('Unpublishing courses without questions...\n');
    
    for (const course of coursesToFix) {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ 
          published: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', course.id);
      
      if (updateError) {
        console.error(`❌ Failed to unpublish course ${course.id}:`, updateError);
      } else {
        console.log(`✅ Unpublished: ${course.title.substring(0, 50)}...`);
      }
    }
    
    console.log(`\n✅ Fixed ${coursesToFix.length} courses`);
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixPublishedWithoutQuestions(); 