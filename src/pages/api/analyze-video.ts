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

// Transform enhanced quiz service response to expected frontend structure
function transformResponseToExpectedFormat(edgeResponse: any): any {
  const { 
    questions = [], 
    video_summary = "AI Generated Course", 
    total_duration,
    visual_moments = [],
    enhanced_features = {}
  } = edgeResponse;
  
  if (!questions || !Array.isArray(questions)) {
    return {
      title: "AI Generated Course",
      description: "Interactive course generated from YouTube video content using AI analysis.",
      duration: "30 minutes",
      segments: [],
      enhanced_features: {
        visual_questions_enabled: false,
        visual_questions_count: 0,
        frame_capture_available: false
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
    
    // Transform question format based on type
    let transformedQuestion: any;
    
    switch (q.type) {
      case 'hotspot':
        transformedQuestion = {
          type: 'hotspot',
          question: q.question || 'Identify the highlighted element',
          visual_context: q.visual_context,
          frame_url: q.frame_url,
          bounding_boxes: q.bounding_boxes || [],
          detected_objects: q.detected_objects || [],
          visual_asset_id: q.visual_asset_id,
          correct_answer: q.correct_answer,
          explanation: q.explanation || 'Visual identification question'
        };
        break;
        
      case 'matching':
        transformedQuestion = {
          type: 'matching',
          question: q.question || 'Match the following elements',
          matching_pairs: q.matching_pairs || [],
          visual_context: q.visual_context,
          frame_url: q.frame_url,
          visual_asset_id: q.visual_asset_id,
          explanation: q.explanation || 'Matching question'
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
          visual_context: q.visual_context
        };
        break;
    }
    
    // Add additional metadata
    transformedQuestion.timestamp = q.timestamp;
    transformedQuestion.has_visual_asset = q.has_visual_asset || false;
    transformedQuestion.visual_question_type = q.visual_question_type;
    
    currentSegment.questions.push(transformedQuestion);
    
    // Add visual context as concepts
    if (q.visual_context) {
      const conceptText = q.visual_context.substring(0, 50);
      if (!currentSegment.concepts.includes(conceptText)) {
        currentSegment.concepts.push(conceptText);
      }
    }
    
    // Add visual moments for this segment
    const relatedVisualMoment = visual_moments.find((vm: any) => 
      Math.abs(vm.timestamp - q.timestamp) < 30
    );
    if (relatedVisualMoment && !currentSegment.visual_moments.some((vm: any) => vm.timestamp === relatedVisualMoment.timestamp)) {
      currentSegment.visual_moments.push(relatedVisualMoment);
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
    ? `${Math.ceil(parseInt(total_duration) / 60)} minutes`
    : "30 minutes";
  
  return {
    title: video_summary.substring(0, 80) + (video_summary.length > 80 ? "..." : ""),
    description: `Interactive course with ${enhanced_features.visual_questions_count || 0} visual questions generated from YouTube video content using AI analysis.`,
    duration: durationText,
    segments: segments,
    video_summary: video_summary,
    visual_moments: visual_moments,
    enhanced_features: enhanced_features
  };
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
    const { youtubeUrl, useEnhanced } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }

    // Step 1: Create course record in database
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: extractVideoTitle(youtubeUrl),
        description: 'AI Generated Course from YouTube Video',
        youtube_url: youtubeUrl,
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

    // Step 2: Call appropriate service based on useEnhanced flag
    const serviceName = useEnhanced ? 'enhanced-quiz-service' : 'gemini-quiz-service';
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
          youtube_url: youtubeUrl,
          max_questions: 10,
          difficulty_level: 'medium',
          focus_topics: ['visual learning', 'educational content'],
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
    console.log(`   - Questions generated: ${edgeData.questions?.length || 0}`);
    console.log(`   - Visual questions: ${edgeData.enhanced_features?.visual_questions_count || 0}`);
    console.log(`   - Video summary: ${edgeData.video_summary?.substring(0, 100) || 'N/A'}...`);
    console.log(`   - Visual moments identified: ${edgeData.visual_moments?.length || 0}`);

    // Step 3: Transform response to expected format
    const transformedData = transformResponseToExpectedFormat(edgeData);

    // Step 4: Update course with generated data
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
        total_questions: edgeData.questions?.length || 0,
        visual_questions: edgeData.enhanced_features?.visual_questions_count || 0,
        segments_created: transformedData.segments?.length || 0,
        video_duration: transformedData.duration,
        visual_moments: edgeData.visual_moments?.length || 0,
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