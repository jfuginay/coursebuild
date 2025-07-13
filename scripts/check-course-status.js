require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCourseStatus() {
  console.log('🔍 Checking course status in database...\n');

  try {
    // Get all courses (both published and unpublished)
    const { data: allCourses, error: allError } = await supabase
      .from('courses')
      .select('id, title, published, created_at, youtube_url')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching all courses:', allError);
      return;
    }

    console.log(`📊 Total courses: ${allCourses?.length || 0}`);
    
    // Count published vs unpublished
    const publishedCourses = allCourses?.filter(c => c.published) || [];
    const unpublishedCourses = allCourses?.filter(c => !c.published) || [];
    
    console.log(`✅ Published courses: ${publishedCourses.length}`);
    console.log(`❌ Unpublished courses: ${unpublishedCourses.length}\n`);

    // Show unpublished courses
    if (unpublishedCourses.length > 0) {
      console.log('📋 Unpublished courses:');
      for (const course of unpublishedCourses) {
        console.log(`   - ${course.title || 'Untitled'}`);
        console.log(`     ID: ${course.id}`);
        console.log(`     Created: ${new Date(course.created_at).toLocaleString()}`);
        
        // Check if this course has questions
        const { count: questionCount, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);
        
        if (!countError) {
          console.log(`     Questions: ${questionCount || 0}`);
          
          // If course has questions but is unpublished, this is likely the issue
          if (questionCount > 0) {
            console.log(`     ⚠️  WARNING: Course has ${questionCount} questions but is not published!`);
          }
        }
        console.log('');
      }
    }

    // Show recent published courses
    if (publishedCourses.length > 0) {
      console.log('\n📚 Recent published courses:');
      const recentPublished = publishedCourses.slice(0, 5);
      for (const course of recentPublished) {
        console.log(`   - ${course.title || 'Untitled'}`);
        console.log(`     ID: ${course.id}`);
        console.log(`     Created: ${new Date(course.created_at).toLocaleString()}`);
      }
    }

    // Check specific course if ID provided as argument
    const courseId = process.argv[2];
    if (courseId) {
      console.log(`\n🔍 Checking specific course: ${courseId}`);
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (courseError) {
        console.error('❌ Course not found:', courseError.message);
      } else {
        console.log('\n📖 Course details:');
        console.log(JSON.stringify(course, null, 2));
        
        // Check questions
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('id, type, timestamp')
          .eq('course_id', courseId)
          .order('timestamp');
        
        if (!questionsError) {
          console.log(`\n❓ Questions: ${questions?.length || 0}`);
          if (questions?.length > 0) {
            console.log('Question types:', questions.map(q => q.type).join(', '));
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Add command to fix unpublished courses with questions
async function fixUnpublishedCourses() {
  console.log('\n🔧 Fixing unpublished courses that have questions...\n');

  try {
    // Get all unpublished courses
    const { data: unpublishedCourses, error: fetchError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('published', false);

    if (fetchError) {
      console.error('❌ Error fetching unpublished courses:', fetchError);
      return;
    }

    let fixedCount = 0;
    
    for (const course of unpublishedCourses || []) {
      // Check if course has questions
      const { count: questionCount, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);
      
      if (!countError && questionCount > 0) {
        // Mark course as published
        const { error: updateError } = await supabase
          .from('courses')
          .update({ published: true })
          .eq('id', course.id);
        
        if (!updateError) {
          console.log(`✅ Fixed: "${course.title}" (${questionCount} questions)`);
          fixedCount++;
        } else {
          console.error(`❌ Failed to fix "${course.title}":`, updateError);
        }
      }
    }

    console.log(`\n📊 Fixed ${fixedCount} courses`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the appropriate function
if (process.argv.includes('--fix')) {
  fixUnpublishedCourses();
} else {
  checkCourseStatus();
} 