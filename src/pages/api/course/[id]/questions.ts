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

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  // Check for authentication
  const authHeader = req.headers.authorization;
  let isAuthenticated = false;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      isAuthenticated = !error && !!user;
    } catch (error) {
      console.warn('Failed to verify auth token:', error);
    }
  }

  try {
    // Fetch questions with bounding boxes for video overlay functionality
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
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // Transform questions for comprehensive question type support
    const transformedQuestions = (questions || []).map(question => {
      const boundingBoxes = question.bounding_boxes || [];
      let metadata: any = {};
      
      // Parse metadata if it exists
      try {
        metadata = question.metadata ? JSON.parse(question.metadata) : {};
      } catch (e) {
        console.warn(`Failed to parse metadata for question ${question.id}`);
      }

      // Parse options - handle both string and array formats for compatibility
      let parsedOptions = question.options;
      if (typeof question.options === 'string') {
        try {
          parsedOptions = JSON.parse(question.options);
        } catch (e) {
          // If parsing fails, treat as single option
          parsedOptions = [question.options];
        }
      }

      return {
        ...question,
        // Ensure options are properly formatted
        options: parsedOptions,
        // Video overlay specific fields
        frame_timestamp: question.frame_timestamp, // When to show overlay on video
        video_overlay: metadata.video_overlay || false,
        detected_elements: metadata.detected_elements || [],
        detected_objects: metadata.detected_objects || [], // Support both field names
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
        requires_video_overlay: question.has_visual_asset && boundingBoxes.length > 0,
        // Legacy compatibility fields
        correct: question.correct_answer, // Support legacy 'correct' field
        visual_context: question.visual_context
      };
    });

    // Filter out invalid hotspot questions that have no interactive elements
    const validQuestions = transformedQuestions.filter(question => {
      // Allow all non-hotspot questions
      if (question.type !== 'hotspot') {
        return true;
      }
      
      // For hotspot questions, ensure they have valid bounding boxes or detected objects
      const hasValidBoundingBoxes = question.bounding_boxes && question.bounding_boxes.length > 0;
      const hasValidDetectedObjects = question.detected_elements && question.detected_elements.length > 0;
      const hasValidDetectedElements = question.detected_objects && question.detected_objects.length > 0;
      
      const isValid = hasValidBoundingBoxes || hasValidDetectedObjects || hasValidDetectedElements;
      
      if (!isValid) {
        console.log(`🚫 Filtering out invalid hotspot question ${question.id} - no interactive elements:`, {
          questionId: question.id,
          type: question.type,
          boundingBoxCount: question.bounding_boxes?.length || 0,
          detectedElementsCount: question.detected_elements?.length || 0,
          detectedObjectsCount: question.detected_objects?.length || 0
        });
      }
      
      return isValid;
    });

    // Additional filtering for questions without proper options (except special types)
    const fullyValidQuestions = validQuestions.filter(question => {
      // Special question types that don't need standard options
      const specialTypes = ['hotspot', 'matching', 'sequencing', 'video_overlay'];
      if (specialTypes.includes(question.type)) {
        return true;
      }

      // True/false questions don't need explicit options
      if (question.type === 'true-false' || question.type === 'true_false') {
        return true;
      }

      // Standard multiple choice needs options
      const hasValidOptions = question.options && 
        (Array.isArray(question.options) ? question.options.length > 0 : question.options.length > 0);
      
      if (!hasValidOptions) {
        console.log(`🚫 Filtering out question ${question.id} - no valid options:`, {
          questionId: question.id,
          type: question.type,
          hasOptions: !!question.options,
          optionsType: typeof question.options,
          optionsValue: question.options
        });
        return false;
      }

      return true;
    });

    // Apply free questions limit for unauthenticated users
    const FREE_QUESTIONS_LIMIT = 3;
    let questionsToReturn = fullyValidQuestions;
    
    if (!isAuthenticated && fullyValidQuestions.length > FREE_QUESTIONS_LIMIT) {
      // Return all questions but mark which ones are locked
      questionsToReturn = fullyValidQuestions.map((question, index) => ({
        ...question,
        isLocked: index >= FREE_QUESTIONS_LIMIT
      }));
    }

    console.log(`✅ Fetched ${questions?.length || 0} questions, filtered to ${fullyValidQuestions.length} valid questions for course ${id}`);
    console.log(`🔒 User authenticated: ${isAuthenticated}, questions limit applied: ${!isAuthenticated}`);
    console.log(`🎬 Video overlay questions: ${fullyValidQuestions.filter(q => q.requires_video_overlay).length}`);
    console.log(`🎯 Questions with bounding boxes: ${fullyValidQuestions.filter(q => q.bounding_box_count > 0).length}`);
    console.log(`🔍 Valid hotspot questions: ${fullyValidQuestions.filter(q => q.type === 'hotspot').length}`);
    console.log(`🔗 Matching questions: ${fullyValidQuestions.filter(q => q.matching_pairs && q.matching_pairs.length > 0).length}`);
    console.log(`🔄 Sequencing questions: ${fullyValidQuestions.filter(q => q.sequence_items && q.sequence_items.length > 0).length}`);
    
    // Debug: Show sample question with bounding boxes
    const questionWithBboxes = fullyValidQuestions.find(q => q.bounding_box_count > 0);
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

    // Debug: Show sample matching question
    const matchingQuestion = fullyValidQuestions.find(q => q.matching_pairs && q.matching_pairs.length > 0);
    if (matchingQuestion) {
      console.log('🔗 Sample matching question:', {
        id: matchingQuestion.id,
        question: matchingQuestion.question.substring(0, 50) + '...',
        type: matchingQuestion.type,
        matching_pairs_count: matchingQuestion.matching_pairs.length,
        matching_pairs_sample: matchingQuestion.matching_pairs[0]
      });
    }

    return res.status(200).json({
      success: true,
      questions: questionsToReturn,
      isAuthenticated,
      freeQuestionsLimit: !isAuthenticated ? FREE_QUESTIONS_LIMIT : null,
      debug: {
        total_questions_fetched: questions?.length || 0,
        valid_questions_returned: questionsToReturn.length,
        filtered_out_count: (questions?.length || 0) - fullyValidQuestions.length,
        video_overlay_questions: fullyValidQuestions.filter(q => q.requires_video_overlay).length,
        questions_with_bboxes: fullyValidQuestions.filter(q => q.bounding_box_count > 0).length,
        valid_hotspot_questions: fullyValidQuestions.filter(q => q.type === 'hotspot').length,
        matching_questions: fullyValidQuestions.filter(q => q.matching_pairs && q.matching_pairs.length > 0).length,
        sequencing_questions: fullyValidQuestions.filter(q => q.sequence_items && q.sequence_items.length > 0).length,
        approach: 'comprehensive_question_types',
        user_authenticated: isAuthenticated
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}