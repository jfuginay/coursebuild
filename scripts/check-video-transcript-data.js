/**
 * Diagnostic script to check video transcript data in the database
 * This helps identify why transcript data might not be loading in recommendations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function checkVideoTranscriptData() {
  console.log('🔍 Checking Video Transcript Data');
  console.log('=====================================\n');

  try {
    // 1. Check if video_transcripts table has any data
    console.log('📊 Step 1: Checking video_transcripts table...');
    
    const { data: transcriptCount, error: countError } = await supabase
      .from('video_transcripts')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting transcripts:', countError);
      return;
    }

    console.log(`✅ Total transcripts in database: ${transcriptCount || 0}`);

    // 2. Get sample transcripts with their associated courses
    console.log('\n📊 Step 2: Fetching sample transcripts with course data...');
    
    const { data: transcripts, error: transcriptError } = await supabase
      .from('video_transcripts')
      .select(`
        id,
        course_id,
        video_url,
        video_summary,
        key_concepts_timeline,
        created_at,
        courses!inner(
          id,
          title,
          description,
          published
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (transcriptError) {
      console.error('❌ Error fetching transcripts:', transcriptError);
      return;
    }

    if (!transcripts || transcripts.length === 0) {
      console.log('❌ No transcripts found in database');
      console.log('\n💡 This means courses were likely generated before the v5 pipeline');
      console.log('   New courses generated with quiz-generation-v5 will have transcript data');
      return;
    }

    console.log(`\n✅ Found ${transcripts.length} recent transcripts:\n`);

    transcripts.forEach((transcript, index) => {
      console.log(`${index + 1}. Course: "${transcript.courses.title}"`);
      console.log(`   Course ID: ${transcript.course_id}`);
      console.log(`   Transcript ID: ${transcript.id}`);
      console.log(`   Created: ${new Date(transcript.created_at).toLocaleString()}`);
      console.log(`   Has Summary: ${!!transcript.video_summary}`);
      
      if (transcript.video_summary) {
        console.log(`   Summary Preview: ${transcript.video_summary.substring(0, 100)}...`);
      }
      
      let conceptCount = 0;
      let conceptsList = [];
      if (transcript.key_concepts_timeline) {
        try {
          if (Array.isArray(transcript.key_concepts_timeline)) {
            conceptCount = transcript.key_concepts_timeline.length;
            conceptsList = transcript.key_concepts_timeline
              .map(item => item.concept)
              .filter(Boolean)
              .slice(0, 5);
          }
        } catch (e) {
          console.log('   ⚠️  Error parsing key_concepts_timeline');
        }
      }
      
      console.log(`   Key Concepts: ${conceptCount} total`);
      if (conceptsList.length > 0) {
        console.log(`   Concepts: ${conceptsList.join(', ')}${conceptCount > 5 ? '...' : ''}`);
      }
      console.log('');
    });

    // 3. Check for courses without transcripts
    console.log('\n📊 Step 3: Checking for courses without transcripts...');
    
    const { data: coursesWithoutTranscripts, error: noTranscriptError } = await supabase
      .from('courses')
      .select('id, title, created_at, published')
      .is('published', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!noTranscriptError && coursesWithoutTranscripts) {
      const coursesWithTranscriptIds = transcripts.map(t => t.course_id);
      const coursesWithoutTranscriptData = coursesWithoutTranscripts.filter(
        course => !coursesWithTranscriptIds.includes(course.id)
      );

      if (coursesWithoutTranscriptData.length > 0) {
        console.log(`\n⚠️  Found ${coursesWithoutTranscriptData.length} recent courses without transcripts:`);
        coursesWithoutTranscriptData.slice(0, 5).forEach((course, index) => {
          console.log(`   ${index + 1}. "${course.title}"`);
          console.log(`      ID: ${course.id}`);
          console.log(`      Created: ${new Date(course.created_at).toLocaleString()}`);
        });
        console.log('\n   These courses need to be reprocessed with quiz-generation-v5 to get transcript data');
      } else {
        console.log('✅ All recent courses have transcript data');
      }
    }

    // 4. Test the getCourseContext query pattern
    console.log('\n📊 Step 4: Testing getCourseContext query pattern...');
    
    if (transcripts.length > 0) {
      const testCourseId = transcripts[0].course_id;
      
      const { data: courseWithTranscript, error: testError } = await supabase
        .from('courses')
        .select(`
          *,
          video_transcripts (
            video_summary,
            key_concepts_timeline
          )
        `)
        .eq('id', testCourseId)
        .single();

      if (testError) {
        console.error('❌ Error with getCourseContext pattern:', testError);
      } else {
        console.log('✅ getCourseContext query pattern works');
        console.log(`   Course: "${courseWithTranscript.title}"`);
        console.log(`   Has transcript data: ${!!courseWithTranscript.video_transcripts}`);
        
        if (courseWithTranscript.video_transcripts) {
          console.log(`   Has summary: ${!!courseWithTranscript.video_transcripts.video_summary}`);
          console.log(`   Has concepts: ${!!courseWithTranscript.video_transcripts.key_concepts_timeline}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnostic
checkVideoTranscriptData()
  .then(() => {
    console.log('\n✅ Diagnostic complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }); 