import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { segment_index, completed_only } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  try {
    const courseId = req.query.id as string;
    const completedOnly = req.query.completed_only !== 'false';
    const includeIncomplete = req.query.include_incomplete === 'true';

    // First, get segment information for this course
    const { data: segments, error: segmentsError } = await supabase
      .from('course_segments')
      .select('*')
      .eq('course_id', courseId)
      .order('segment_index', { ascending: true });

    if (segmentsError) {
      console.error('Error fetching segments:', segmentsError);
      return res.status(500).json({ error: 'Failed to fetch segments' });
    }

    // Build query for questions
    let query = supabase
      .from('questions')
      .select(`
        *,
        bounding_boxes!bounding_boxes_question_id_fkey (
          id,
          label,
          x,
          y,
          width,
          height,
          confidence_score,
          is_correct_answer
        )
      `)
      .eq('course_id', courseId)
      .order('segment_id', { ascending: true })
      .order('timestamp', { ascending: true });

    // Filter by specific segment if requested
    if (segment_index !== undefined) {
      query = query.eq('segment_index', parseInt(segment_index as string));
    } else if (completedOnly && !includeIncomplete) {
      // Only get questions from completed segments
      const completedSegments = segments?.filter(s => s.status === 'completed') || [];
      const completedIndices = completedSegments.map(s => s.segment_index);
      
      if (completedIndices.length === 0) {
        return res.status(200).json({
          success: true,
          questions: [],
          segments: segments || [],
          completed_segments: 0,
          total_segments: segments?.length || 0
        });
      }
      
      query = query.in('segment_index', completedIndices);
    }

    const { data: questions, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // Transform questions (same as existing questions.ts endpoint)
    const transformedQuestions = (questions || []).map(question => {
      const boundingBoxes = question.bounding_boxes || [];
      let metadata: any = {};
      
      try {
        metadata = question.metadata ? JSON.parse(question.metadata) : {};
      } catch (e) {
        console.warn(`Failed to parse metadata for question ${question.id}`);
      }

      let parsedOptions = question.options;
      if (typeof question.options === 'string') {
        try {
          parsedOptions = JSON.parse(question.options);
        } catch (e) {
          parsedOptions = [question.options];
        }
      }

      return {
        ...question,
        options: parsedOptions,
        frame_timestamp: question.frame_timestamp,
        video_overlay: metadata.video_overlay || false,
        detected_elements: metadata.detected_elements || [],
        detected_objects: metadata.detected_objects || [],
        matching_pairs: metadata.matching_pairs || [],
        sequence_items: metadata.sequence_items || [],
        bounding_boxes: boundingBoxes.map((box: any) => ({
          id: box.id,
          label: box.label,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          isCorrectAnswer: box.is_correct_answer,
          confidenceScore: box.confidence_score
        })),
        has_visual_overlay: boundingBoxes.length > 0,
        bounding_box_count: boundingBoxes.length,
        requires_video_overlay: question.has_visual_asset && boundingBoxes.length > 0,
        correct: question.correct_answer,
        visual_context: question.visual_context
      };
    });

    // Filter out invalid questions
    const validQuestions = transformedQuestions.filter(question => {
      if (question.type !== 'hotspot') {
        return true;
      }
      
      const hasValidBoundingBoxes = question.bounding_boxes && question.bounding_boxes.length > 0;
      const hasValidDetectedObjects = question.detected_elements && question.detected_elements.length > 0;
      const hasValidDetectedElements = question.detected_objects && question.detected_objects.length > 0;
      
      return hasValidBoundingBoxes || hasValidDetectedObjects || hasValidDetectedElements;
    });

    const fullyValidQuestions = validQuestions.filter(question => {
      const specialTypes = ['hotspot', 'matching', 'sequencing', 'video_overlay'];
      if (specialTypes.includes(question.type)) {
        return true;
      }

      if (question.type === 'true-false' || question.type === 'true_false') {
        return true;
      }

      const hasValidOptions = question.options && 
        (Array.isArray(question.options) ? question.options.length > 0 : question.options.length > 0);
      
      return hasValidOptions;
    });

    // Calculate progress
    const completedSegments = segments?.filter(s => s.status === 'completed').length || 0;
    const totalSegments = segments?.length || 0;

    // Calculate segment question counts
    const segmentQuestionCounts: Record<number, { planned: number; generated: number }> = {};
    segments?.forEach((segment: any) => {
      segmentQuestionCounts[segment.segment_index] = {
        planned: segment.planned_questions_count || 0,
        generated: segment.questions_count || 0
      };
    });

    // Only log when questions are actually returned or on verbose mode
    if (fullyValidQuestions.length > 0 || process.env.VERBOSE_LOGGING === 'true') {
      console.log('📊 Segment questions API:', {
        course_id: id,
        segment_index,
        completed_only,
        include_incomplete: includeIncomplete,
        total_segments: segments?.length || 0,
        completed_segments: segments?.filter((s: any) => s.status === 'completed').length || 0,
        questions_returned: fullyValidQuestions.length
      });
    }

    return res.status(200).json({
      success: true,
      questions: fullyValidQuestions,
      segments: segments || [],
      completed_segments: completedSegments,
      total_segments: totalSegments,
      progress_percentage: totalSegments > 0 ? Math.round((completedSegments / totalSegments) * 100) : 0
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 