import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CheckAndPublishRequest {
  course_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { course_id }: CheckAndPublishRequest = await req.json();
    
    console.log(`🔍 Checking if course ${course_id} is ready to publish`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message || 'Unknown error'}`);
    }

    // If already published, nothing to do
    if (course.published) {
      console.log('Course is already published');
      return new Response(
        JSON.stringify({
          success: true,
          published: true,
          message: 'Course is already published'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all segments for the course
    const { data: segments, error: segmentsError } = await supabase
      .from('course_segments')
      .select('*')
      .eq('course_id', course_id)
      .order('segment_index', { ascending: true });
      
    if (segmentsError || !segments) {
      throw new Error(`Failed to fetch segments: ${segmentsError?.message || 'Unknown error'}`);
    }
    
    // Check if all segments are completed
    const allSegmentsComplete = segments.every(s => s.status === 'completed');
    if (!allSegmentsComplete) {
      const incompleteCount = segments.filter(s => s.status !== 'completed').length;
      console.log(`📊 ${incompleteCount} segments still processing`);
      return new Response(
        JSON.stringify({
          success: true,
          published: false,
          message: `${incompleteCount} segments still processing`,
          segments_total: segments.length,
          segments_completed: segments.filter(s => s.status === 'completed').length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get question generation status
    const { data: questionPlans, error: plansError } = await supabase
      .from('question_plans')
      .select('*')
      .eq('course_id', course_id);
      
    if (!plansError && questionPlans && questionPlans.length > 0) {
      const statusCounts = questionPlans.reduce((acc, plan) => {
        acc[plan.status] = (acc[plan.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`📊 Question plan status:`, statusCounts);
      
      // Check if any questions are still being generated
      const pendingCount = (statusCounts['planned'] || 0) + (statusCounts['generating'] || 0);
      if (pendingCount > 0) {
        console.log(`⏳ ${pendingCount} questions still being generated`);
        return new Response(
          JSON.stringify({
            success: true,
            published: false,
            message: `${pendingCount} questions still being generated`,
            question_status: statusCounts
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Count actual questions in the database
    const { count: questionCount, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course_id);
      
    if (countError) {
      console.error('Failed to count questions:', countError);
      throw new Error(`Failed to count questions: ${countError.message}`);
    }
    
    console.log(`📊 Total questions in database: ${questionCount || 0}`);
    
    if (!questionCount || questionCount === 0) {
      console.warn(`⚠️ No questions found for course ${course_id}. Not marking as published.`);
      return new Response(
        JSON.stringify({
          success: true,
          published: false,
          message: 'No questions found in database',
          question_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // All checks passed - publish the course
    const { error: publishError } = await supabase
      .from('courses')
      .update({ 
        published: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', course_id);
      
    if (publishError) {
      console.error('Failed to publish course:', publishError);
      throw new Error(`Failed to publish course: ${publishError.message}`);
    }
    
    console.log(`✅ Course ${course_id} published with ${questionCount} questions!`);
    
    // Update progress if available
    const { data: progress } = await supabase
      .from('quiz_generation_progress')
      .select('session_id')
      .eq('course_id', course_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (progress?.session_id) {
      await supabase
        .from('quiz_generation_progress')
        .update({
          stage: 'completed',
          current_step: 'Course published successfully',
          stage_progress: 1.0,
          overall_progress: 1.0,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', course_id)
        .eq('session_id', progress.session_id);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        published: true,
        message: `Course published with ${questionCount} questions`,
        question_count: questionCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Check and publish error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 