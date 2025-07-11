import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { course_id } = await req.json();

    if (!course_id) {
      return new Response(
        JSON.stringify({ error: 'course_id is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`📝 Updating course summary for course: ${course_id}`);

    // First, check if the course has a generic description
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, description, youtube_url')
      .eq('id', course_id)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Check if description is generic
    const isGenericDescription = course.description && (
      course.description.includes('Interactive course from') ||
      course.description.includes('AI-powered interactive course') ||
      course.description.includes('AI Generated Course')
    );

    if (!isGenericDescription) {
      console.log('Course already has a custom description, skipping update');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Course already has a custom description',
          description: course.description
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Fetch the latest transcript for this course
    const { data: transcript, error: transcriptError } = await supabase
      .from('video_transcripts')
      .select('video_summary')
      .eq('course_id', course_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (transcriptError || !transcript || !transcript.video_summary) {
      console.log('No transcript or video summary found for course');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No video summary available yet',
          error: transcriptError?.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Update the course with the AI-generated summary
    const { error: updateError } = await supabase
      .from('courses')
      .update({ 
        description: transcript.video_summary 
      })
      .eq('id', course_id);

    if (updateError) {
      console.error('Error updating course:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update course description',
          details: updateError.message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`✅ Course description updated with AI-generated summary`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Course description updated successfully',
        description: transcript.video_summary
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in update-course-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}); 