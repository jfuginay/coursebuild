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

    // Fetch questions with their single visual asset and bounding boxes
    const { data: questions, error } = await supabase
      .from('questions')
      .select(`
        *,
        visual_assets!questions_visual_asset_id_fkey (
          id,
          image_url,
          thumbnail_url,
          width,
          height,
          alt_text
        ),
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

    // Transform questions to include visual data in the expected format
    const transformedQuestions = (questions || []).map(question => {
      const visualAsset = question.visual_assets; // Single visual asset object (not array)
      const boundingBoxes = question.bounding_boxes || [];

      return {
        ...question,
        // Add visual question fields
        frame_url: visualAsset?.image_url,
        thumbnail_url: visualAsset?.thumbnail_url,
        visual_asset_id: visualAsset?.id,
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
        // For debugging
        has_visual_data: !!visualAsset,
        bounding_box_count: boundingBoxes.length
      };
    });

    console.log(`✅ Fetched ${transformedQuestions.length} questions for course ${id}`);
    console.log(`📊 Visual questions: ${transformedQuestions.filter(q => q.has_visual_data).length}`);
    console.log(`🎯 Questions with bounding boxes: ${transformedQuestions.filter(q => q.bounding_box_count > 0).length}`);

    return res.status(200).json({
      success: true,
      questions: transformedQuestions,
      debug: {
        total_questions: transformedQuestions.length,
        visual_questions: transformedQuestions.filter(q => q.has_visual_data).length,
        questions_with_bboxes: transformedQuestions.filter(q => q.bounding_box_count > 0).length
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 