import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// YouTube URL validation function
function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return true;
    }
  }
  
  return false;
}

// Extract video title from URL (simplified version)
function extractVideoTitle(url: string): string {
  const videoId = extractVideoId(url);
  return videoId ? `YouTube Video (${videoId})` : 'YouTube Video';
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Sanitize YouTube URL to just the core video URL for cache comparison
function sanitizeYouTubeUrl(url: string): string {
  const videoId = extractVideoId(url);
  if (!videoId) {
    console.warn('⚠️ Could not extract video ID from URL:', url);
    return url; // Return original if we can't extract video ID
  }
  
  const sanitized = `https://www.youtube.com/watch?v=${videoId}`;
  if (url !== sanitized) {
    console.log(`🧹 URL sanitized: ${url} → ${sanitized}`);
  }
  
  return sanitized;
}

// Transform quiz-generation-v4 response to expected frontend structure
function transformResponseToExpectedFormat(edgeResponse: any): any {
  // Handle new quiz-generation-v4 response structure
  const { 
    final_questions = [], 
    video_summary = "AI Generated Course", 
    total_duration = 0,
    pipeline_results = {},
    pipeline_metadata = {}
  } = edgeResponse;
  
  // Use final_questions from quiz-generation-v4 response
  const questions = final_questions || [];
  
  if (!questions || !Array.isArray(questions)) {
    return {
      title: "AI Generated Course",
      description: "Interactive course generated from YouTube video content using AI analysis.",
      duration: "30 minutes",
      segments: [],
      enhanced_features: {
        visual_questions_enabled: false,
        visual_questions_count: 0,
        frame_capture_available: false,
        pipeline_v4_enabled: true
      }
    };
  }
  
  // Group questions by timestamp ranges to create segments
  const segments: any[] = [];
  const sortedQuestions = questions.sort((a: any, b: any) => a.timestamp - b.timestamp);
  
  let currentSegment: any = {
    title: "Introduction",
    timestamp: "00:00",
    concepts: [] as string[],
    questions: [] as any[],
    visual_moments: [] as any[]
  };
  
  sortedQuestions.forEach((q: any, index: number) => {
    const minutes = Math.floor(q.timestamp / 60);
    const seconds = q.timestamp % 60;
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Create new segment every 3-4 questions or significant time gap
    if (index > 0 && (index % 3 === 0 || q.timestamp - sortedQuestions[index - 1].timestamp > 300)) {
      segments.push(currentSegment);
      currentSegment = {
        title: `Segment ${segments.length + 1}`,
        timestamp: timestamp,
        concepts: [] as string[],
        questions: [] as any[],
        visual_moments: [] as any[]
      };
    }
    
    // Parse metadata if available
    let metadata: any = {};
    try {
      if (q.metadata) {
        metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
      }
    } catch (e) {
      console.warn('Failed to parse question metadata:', e);
    }
    
    // Transform question format based on type
    let transformedQuestion: any;
    
    switch (q.type) {
      case 'hotspot':
        transformedQuestion = {
          type: 'hotspot',
          question: q.question || 'Identify the highlighted element',
          visual_context: metadata.question_context || q.visual_context,
          frame_url: q.frame_url,
          bounding_boxes: q.bounding_boxes || [],
          detected_objects: q.detected_objects || [],
          visual_asset_id: q.visual_asset_id,
          correct_answer: q.correct_answer,
          explanation: q.explanation || 'Visual identification question',
          target_objects: metadata.target_objects || [],
          frame_timestamp: q.frame_timestamp || metadata.frame_timestamp
        };
        break;
        
      case 'matching':
        transformedQuestion = {
          type: 'matching',
          question: q.question || 'Match the following elements',
          matching_pairs: metadata.matching_pairs || [],
          visual_context: q.visual_context,
          frame_url: q.frame_url,
          visual_asset_id: q.visual_asset_id,
          explanation: q.explanation || 'Matching question',
          relationship_type: metadata.relationship_type || 'general'
        };
        break;
        
      case 'sequencing':
        transformedQuestion = {
          type: 'sequencing',
          question: q.question || 'Arrange in correct sequence',
          sequence_items: metadata.sequence_items || [],
          visual_context: q.visual_context,
          explanation: q.explanation || 'Sequencing question',
          sequence_type: metadata.sequence_type || 'general'
        };
        break;
        
      case 'multiple-choice':
      case 'true-false':
      default:
        transformedQuestion = {
          type: q.type === 'true-false' ? 'true_false' : 'multiple_choice',
          question: q.question || 'Sample question',
          options: q.options || (q.type === 'true-false' ? ["True", "False"] : ["Option A", "Option B", "Option C", "Option D"]),
          correct_answer: typeof q.correct_answer === 'string' ? parseInt(q.correct_answer) || 0 : (q.correct_answer || 0),
          explanation: q.explanation || 'No explanation provided',
          visual_context: q.visual_context,
          misconception_analysis: metadata.misconception_analysis || {}
    };
        break;
    }
    
    // Add additional metadata
    transformedQuestion.timestamp = q.timestamp;
    transformedQuestion.has_visual_asset = q.has_visual_asset || false;
    transformedQuestion.quality_score = q.quality_score || 0;
    transformedQuestion.meets_threshold = q.meets_threshold || false;
    
    currentSegment.questions.push(transformedQuestion);
    
    // Add visual context as concepts
    if (q.visual_context || metadata.question_context) {
      const conceptText = (q.visual_context || metadata.question_context || '').substring(0, 50);
      if (conceptText && !currentSegment.concepts.includes(conceptText)) {
        currentSegment.concepts.push(conceptText);
      }
    }
  });
  
  // Add the last segment
  if (currentSegment.questions.length > 0) {
    segments.push(currentSegment);
  }
  
  // If no segments were created, create a default one
  if (segments.length === 0) {
    segments.push({
      title: "Sample Content",
      timestamp: "00:00",
      concepts: ["AI Generated Content"],
      questions: [{
        type: 'multiple_choice' as const,
        question: 'What is this video about?',
        options: ["Educational content", "Entertainment", "Tutorial", "Other"],
        correct: 0,
        explanation: 'This appears to be educational content based on the analysis.',
        has_visual_asset: false
      }],
      visual_moments: []
    });
  }
  
  // Calculate duration from total_duration or estimate
  const durationText = total_duration 
    ? `${Math.ceil(total_duration / 60)} minutes`
    : "30 minutes";
  
  // Calculate enhanced features from pipeline results
  const visualQuestionsCount = questions.filter((q: any) => q.has_visual_asset).length;
  const avgQualityScore = questions.length > 0 
    ? questions.reduce((sum: number, q: any) => sum + (q.quality_score || 0), 0) / questions.length 
    : 0;
  
  return {
    title: video_summary.substring(0, 80) + (video_summary.length > 80 ? "..." : ""),
    description: `Interactive course with ${visualQuestionsCount} visual questions generated using Quiz Generation Pipeline v4.0.`,
    duration: durationText,
    segments: segments,
    video_summary: video_summary,
    visual_moments: [],
    enhanced_features: {
      visual_questions_enabled: visualQuestionsCount > 0,
      visual_questions_count: visualQuestionsCount,
      frame_capture_available: true,
      pipeline_v4_enabled: true,
      average_quality_score: avgQualityScore,
      pipeline_metadata: pipeline_metadata
    }
  };
}

// Cache lookup function
async function checkCacheForVideo(youtubeUrl: string, excludeCourseId: string) {
  const sanitizedUrl = sanitizeYouTubeUrl(youtubeUrl);
  console.log('🔍 Checking cache for video:', sanitizedUrl, 'excluding course:', excludeCourseId);
  
  try {
    // Find existing course with same sanitized YouTube URL that has questions (excluding the current one)
    const { data: existingCourses, error: courseError } = await supabase
      .from('courses')
      .select(`
        id, 
        title, 
        description, 
        youtube_url, 
        published,
        created_at
      `)
      .eq('youtube_url', sanitizedUrl)
      .eq('published', true)
      .neq('id', excludeCourseId)  // Exclude the course we just created
      .order('created_at', { ascending: false });

    if (courseError) {
      console.error('Cache lookup error:', courseError);
      return null;
    }

    if (!existingCourses || existingCourses.length === 0) {
      console.log('❌ No cached course found (excluding current course)');
      return null;
    }

    // Check if the most recent course has questions
    for (const course of existingCourses) {
      const { data: questionCount, error: countError } = await supabase
        .from('questions')
        .select('id', { count: 'exact' })
        .eq('course_id', course.id)
        .limit(1);

      if (!countError && questionCount && questionCount.length > 0) {
        console.log('✅ Found cached course with questions:', course.id);
        return course;
      }
    }

    console.log('❌ No cached course with questions found');
    return null;
  } catch (error) {
    console.error('Cache lookup failed:', error);
    return null;
  }
}

// Data reconstruction function
async function reconstructCourseData(cachedCourse: any) {
  console.log('🔄 Reconstructing course data from cache...');
  
  try {
    // Get all questions first
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        *,
        question_quality_metrics (
          overall_score,
          educational_value_score,
          meets_threshold,
          quality_analysis
        )
      `)
      .eq('course_id', cachedCourse.id)
      .order('timestamp', { ascending: true });

    if (questionsError) {
      throw new Error(`Failed to retrieve cached questions: ${questionsError.message}`);
    }

    console.log(`✅ Retrieved ${questions.length} questions from cache`);

    // Get visual assets for all questions in separate query
    const { data: visualAssets, error: visualAssetsError } = await supabase
      .from('visual_assets')
      .select('*')
      .in('question_id', questions.map(q => q.id));

    if (visualAssetsError) {
      console.warn('Failed to retrieve visual assets:', visualAssetsError.message);
    }

    // Get bounding boxes for all questions in separate query  
    const { data: boundingBoxes, error: boundingBoxesError } = await supabase
      .from('bounding_boxes')
      .select('*')
      .in('question_id', questions.map(q => q.id));

    if (boundingBoxesError) {
      console.warn('Failed to retrieve bounding boxes:', boundingBoxesError.message);
    }

    // Manually join the data
    const questionsWithRelatedData = questions.map(question => ({
      ...question,
      visual_assets: visualAssets?.filter(va => va.question_id === question.id) || [],
      bounding_boxes: boundingBoxes?.filter(bb => bb.question_id === question.id) || []
    }));

    // Reconstruct the edge function response format
    const reconstructedResponse = {
      final_questions: questionsWithRelatedData.map(q => ({
        id: q.id,
        timestamp: q.timestamp,
        question: q.question,
        type: q.type,
        options: q.options ? JSON.parse(q.options) : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        has_visual_asset: q.has_visual_asset,
        visual_asset_id: q.visual_asset_id,
        visual_question_type: q.visual_question_type,
        frame_timestamp: q.frame_timestamp,
        metadata: q.metadata,
        quality_score: q.quality_score,
        meets_threshold: q.meets_threshold,
        
        // Include related data
        visual_assets: q.visual_assets || [],
        bounding_boxes: q.bounding_boxes || [],
        frame_url: q.visual_assets?.[0]?.image_url || null,
        detected_objects: q.bounding_boxes?.map((bb: any) => bb.label) || [],
        
        // Parse metadata for specific question types
        visual_context: q.metadata?.visual_context || null,
        target_objects: q.metadata?.target_objects || [],
        matching_pairs: q.metadata?.matching_pairs || [],
        sequence_items: q.metadata?.sequence_items || [],
        misconception_analysis: q.metadata?.misconception_analysis || {}
      })),
      
      video_summary: cachedCourse.description || 'Cached course content',
      total_duration: 0, // Could be stored in course metadata
      
      pipeline_results: {
        verification: {
          verification_metadata: {
            average_score: questionsWithRelatedData.length > 0 
              ? questionsWithRelatedData.reduce((sum, q) => sum + (q.quality_score || 0), 0) / questionsWithRelatedData.length 
              : 0
          }
        }
      },
      
      pipeline_metadata: {
        cached: true,
        original_course_id: cachedCourse.id,
        cache_timestamp: cachedCourse.created_at,
        stage_timings: {
          planning: 0,
          generation: 0,
          verification: 0,
          cache_retrieval: Date.now()
        }
      }
    };

    return reconstructedResponse;
  } catch (error) {
    console.error('Failed to reconstruct course data:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { youtubeUrl, useCache = true } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }

    // Step 1: Create course record in database
    const sanitizedUrl = sanitizeYouTubeUrl(youtubeUrl);
    console.log('📝 Original URL:', youtubeUrl);
    console.log('🧹 Sanitized URL:', sanitizedUrl);
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: extractVideoTitle(youtubeUrl),
        description: 'AI Generated Course from YouTube Video',
        youtube_url: sanitizedUrl,  // Store sanitized URL for consistent cache lookups
        published: false
      })
      .select()
      .single();

    if (courseError) {
      console.error('Course creation error:', courseError);
      return res.status(500).json({ 
        error: 'Failed to create course record',
        message: courseError.message 
      });
    }

    console.log('✅ Course created:', course.id);

    // Step 2: Check cache if enabled
    if (useCache) {
      const cachedCourse = await checkCacheForVideo(youtubeUrl, course.id);
      
      if (cachedCourse) {
        console.log('🎯 Using cached course data');
        
        try {
          const reconstructedData = await reconstructCourseData(cachedCourse);
          const transformedData = transformResponseToExpectedFormat(reconstructedData);
          
          // Update new course with cached data
          const { error: updateError } = await supabase
            .from('courses')
            .update({
              title: transformedData.title,
              description: transformedData.description,
              published: true
            })
            .eq('id', course.id);

          if (updateError) {
            console.error('Course update error:', updateError);
            // Continue anyway, as the main content was generated
          }

          console.log('🎉 Course generation completed using cache!');
          console.log(`   - Course ID: ${course.id}`);
          console.log(`   - Cached from: ${cachedCourse.id}`);
          console.log(`   - Total questions: ${reconstructedData.final_questions.length}`);

          return res.status(200).json({
            success: true,
            data: transformedData,
            course_id: course.id,
            enhanced_features: transformedData.enhanced_features,
            processing_summary: {
              total_questions: reconstructedData.final_questions.length,
              visual_questions: reconstructedData.final_questions.filter((q: any) => q.has_visual_asset).length,
              segments_created: transformedData.segments?.length || 0,
              video_duration: transformedData.duration,
              cached: true,
              original_course_id: cachedCourse.id,
              service_used: 'cache'
            }
          });
        } catch (cacheError) {
          console.error('Cache reconstruction failed, falling back to fresh generation:', cacheError);
          // Continue to fresh generation below
        }
      } else {
        console.log('ℹ️ No cache found, proceeding with fresh generation');
      }
    } else {
      console.log('⏭️ Cache disabled, proceeding with fresh generation');
    }

    // Step 3: Call quiz-generation-v5 service (replacing enhanced-quiz-service)
    const serviceName = 'quiz-generation-v5';

    const edgeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${serviceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        },
        body: JSON.stringify({
          course_id: course.id,
          youtube_url: sanitizedUrl,  // Use sanitized URL for consistency
          max_questions: 10,
          difficulty_level: 'intermediate',
          enable_visual_questions: true
        })
      }
    );

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('Edge function error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to generate questions',
        message: errorText 
      });
    }

    const edgeData = await edgeResponse.json();
    console.log(`✅ ${serviceName} completed successfully!`);
    console.log(`   - Questions generated: ${edgeData.final_questions?.length || 0}`);
    console.log(`   - Quality metrics: Average score ${edgeData.pipeline_results?.verification?.verification_metadata?.average_score || 0}`);
    console.log(`   - Visual questions: ${edgeData.final_questions?.filter((q: any) => q.has_visual_asset).length || 0}`);
    console.log(`   - Pipeline timings: ${JSON.stringify(edgeData.pipeline_metadata?.stage_timings || {})}`);

    // Step 4: Transform response to expected format
    const transformedData = transformResponseToExpectedFormat(edgeData);

    // Step 5: Update course with generated data
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        title: transformedData.title,
        description: transformedData.description,
        published: true
      })
      .eq('id', course.id);

    if (updateError) {
      console.error('Course update error:', updateError);
      // Continue anyway, as the main content was generated
    }

    console.log('🎉 Course generation completed successfully!');
    console.log(`   - Course ID: ${course.id}`);
    console.log(`   - Total segments: ${transformedData.segments?.length || 0}`);
    console.log(`   - Enhanced features: ${JSON.stringify(transformedData.enhanced_features)}`);
    console.log(`   - Service used: ${serviceName}`);

    return res.status(200).json({
      success: true,
      data: transformedData,
      course_id: course.id,
      enhanced_features: transformedData.enhanced_features,
      processing_summary: {
        total_questions: edgeData.final_questions?.length || 0,
        visual_questions: edgeData.final_questions?.filter((q: any) => q.has_visual_asset).length || 0,
        segments_created: transformedData.segments?.length || 0,
        video_duration: transformedData.duration,
        visual_moments: [], // No longer available in new pipeline
        cached: false,
        service_used: serviceName
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to analyze video',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}