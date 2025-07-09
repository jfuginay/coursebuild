import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Fetch questions with bounding boxes for video overlay
    const { data: questions, error } = await supabase
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
      .eq('course_id', id)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch questions',
        message: error.message 
      });
    }

    // Transform questions for video overlay approach
    const transformedQuestions = (questions || []).map(question => {
      const boundingBoxes = question.bounding_boxes || [];
      let metadata: any = {};
      
      // Parse metadata if it exists
      try {
        metadata = question.metadata ? JSON.parse(question.metadata) : {};
      } catch (e) {
        console.warn(`Failed to parse metadata for question ${question.id}`);
      }

      return {
        ...question,
        // Video overlay specific fields
        frame_timestamp: question.frame_timestamp, // When to show overlay on video
        video_overlay: metadata.video_overlay || false,
        detected_elements: metadata.detected_elements || [],
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
        // For debugging and compatibility
        has_visual_overlay: boundingBoxes.length > 0,
        bounding_box_count: boundingBoxes.length,
        requires_video_overlay: question.has_visual_asset && boundingBoxes.length > 0
      };
    });

    console.log(`✅ Fetched ${transformedQuestions.length} questions for course ${id}`);
    console.log(`🎬 Video overlay questions: ${transformedQuestions.filter(q => q.requires_video_overlay).length}`);
    console.log(`🎯 Questions with bounding boxes: ${transformedQuestions.filter(q => q.bounding_box_count > 0).length}`);
    
    // Debug: Show sample question with bounding boxes
    const questionWithBboxes = transformedQuestions.find(q => q.bounding_box_count > 0);
    if (questionWithBboxes) {
      console.log('🔍 Sample video overlay question:', {
        id: questionWithBboxes.id,
        question: questionWithBboxes.question.substring(0, 50) + '...',
        type: questionWithBboxes.type,
        timestamp: questionWithBboxes.timestamp,
        frame_timestamp: questionWithBboxes.frame_timestamp,
        video_overlay: questionWithBboxes.video_overlay,
        bounding_boxes_count: questionWithBboxes.bounding_boxes.length,
        bounding_boxes_sample: questionWithBboxes.bounding_boxes[0]
      });
    }

    return res.status(200).json({
      success: true,
      questions: transformedQuestions,
      debug: {
        total_questions: transformedQuestions.length,
        video_overlay_questions: transformedQuestions.filter(q => q.requires_video_overlay).length,
        questions_with_bboxes: transformedQuestions.filter(q => q.bounding_box_count > 0).length,
        approach: 'video_overlay'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 