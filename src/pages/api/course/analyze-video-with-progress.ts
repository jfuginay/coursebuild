import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { course_id, youtube_url, session_id, max_questions = 4, enable_quality_verification = false } = req.body;

    if (!course_id || !youtube_url || !session_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: course_id, youtube_url, and session_id are required' 
      });
    }

    console.log('🚀 Starting video analysis with progress tracking...');
    console.log(`   📚 Course ID: ${course_id}`);
    console.log(`   📹 YouTube URL: ${youtube_url}`);
    console.log(`   📊 Session ID: ${session_id}`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize progress tracking
    console.log('📊 Initializing progress tracking...');
    await supabase
      .from('processing_progress')
      .upsert({
        course_id: course_id,
        session_id: session_id,
        stage: 'initialization',
        stage_progress: 0.0,
        overall_progress: 0.0,
        current_step: 'Starting video analysis pipeline',
        details: {
          youtube_url: youtube_url,
          max_questions: max_questions,
          enable_quality_verification: enable_quality_verification,
          started_at: new Date().toISOString()
        }
      }, {
        onConflict: 'course_id,session_id'
      });

    // Call the quiz generation v4.0 pipeline
    console.log('🔄 Calling Quiz Generation v5.0 pipeline...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const quizGenerationUrl = `${supabaseUrl}/functions/v1/quiz-generation-v5`;

    // Update progress: Moving to planning stage
    await supabase
      .from('processing_progress')
      .upsert({
        course_id: course_id,
        session_id: session_id,
        stage: 'initialization',
        stage_progress: 0.8,
        overall_progress: 0.04,
        current_step: 'Connecting to quiz generation pipeline',
        details: {
          pipeline_url: quizGenerationUrl,
          pipeline_status: 'connecting'
        }
      }, {
        onConflict: 'course_id,session_id'
      });

    const pipelineResponse = await fetch(quizGenerationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'apikey': apiKey!
      },
      body: JSON.stringify({
        course_id: course_id,
        youtube_url: youtube_url,
        session_id: session_id, // Pass session_id to pipeline
        max_questions: max_questions,
        enable_quality_verification: enable_quality_verification
      })
    });

    if (!pipelineResponse.ok) {
      const errorText = await pipelineResponse.text();
      console.error('❌ Quiz Generation v4.0 pipeline failed:', errorText);
      
      // Update progress to failed state
      await supabase
        .from('processing_progress')
        .upsert({
          course_id: course_id,
          session_id: session_id,
          stage: 'failed',
          stage_progress: 0.0,
          overall_progress: 0.05,
          current_step: 'Pipeline failed',
          details: {
            error_message: errorText,
            failed_at: new Date().toISOString()
          }
        }, {
          onConflict: 'course_id,session_id'
        });

      return res.status(500).json({
        success: false,
        error: 'Quiz generation pipeline failed',
        details: errorText
      });
    }

    const pipelineResult = await pipelineResponse.json();
    console.log('✅ Quiz Generation v4.0 pipeline completed:', pipelineResult.success);

    if (pipelineResult.success) {
      // Final progress update: Mark as completed
      await supabase
        .from('processing_progress')
        .upsert({
          course_id: course_id,
          session_id: session_id,
          stage: 'completed',
          stage_progress: 1.0,
          overall_progress: 1.0,
          current_step: 'Video processing completed successfully',
          details: {
            completed_at: new Date().toISOString(),
            total_questions: pipelineResult.final_questions?.length || 0,
            success_rate: pipelineResult.pipeline_metadata?.success_rate || 0,
            total_time_ms: pipelineResult.pipeline_metadata?.total_time_ms || 0
          }
        }, {
          onConflict: 'course_id,session_id'
        });

      // Update course status
      await supabase
        .from('courses')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', course_id);

      return res.status(200).json({
        success: true,
        message: 'Video processing started successfully with progress tracking',
        session_id: session_id,
        course_id: course_id,
        pipeline_result: pipelineResult
      });

    } else {
      // Pipeline failed
      await supabase
        .from('processing_progress')
        .upsert({
          course_id: course_id,
          session_id: session_id,
          stage: 'failed',
          stage_progress: 0.0,
          overall_progress: 0.5,
          current_step: 'Pipeline execution failed',
          details: {
            error_message: pipelineResult.error || 'Unknown pipeline error',
            failed_at: new Date().toISOString()
          }
        }, {
          onConflict: 'course_id,session_id'
        });

      return res.status(500).json({
        success: false,
        error: 'Pipeline execution failed',
        details: pipelineResult.error
      });
    }

  } catch (error) {
    console.error('❌ Video analysis with progress tracking failed:', error);
    
    // If we have session info, update progress to failed
    if (req.body.session_id && req.body.course_id) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase
          .from('processing_progress')
          .upsert({
            course_id: req.body.course_id,
            session_id: req.body.session_id,
            stage: 'failed',
            stage_progress: 0.0,
            overall_progress: 0.05,
            current_step: 'System error occurred',
            details: {
              error_message: error instanceof Error ? error.message : String(error),
              failed_at: new Date().toISOString()
            }
          }, {
            onConflict: 'course_id,session_id'
          });
      } catch (progressError) {
        console.error('❌ Failed to update progress after error:', progressError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    });
  }
} 