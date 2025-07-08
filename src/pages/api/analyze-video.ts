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

// Transform edge function response to match expected structure
function transformResponseToExpectedFormat(edgeResponse: any): any {
  const { questions } = edgeResponse;
  
  if (!questions || !Array.isArray(questions)) {
    return {
      title: "AI Generated Course",
      description: "Interactive course generated from YouTube video content using AI analysis.",
      duration: "30 minutes",
      segments: []
    };
  }
  
  // Group questions by timestamp ranges to create segments
  const segments: any[] = [];
  const sortedQuestions = questions.sort((a: any, b: any) => a.timestamp - b.timestamp);
  
  let currentSegment: any = {
    title: "Introduction",
    timestamp: "00:00",
    concepts: [] as string[],
    questions: [] as any[]
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
        questions: [] as any[]
      };
    }
    
    // Transform question format
    const transformedQuestion = {
      type: 'multiple_choice' as const,
      question: q.question || 'Sample question',
      options: q.options || ["True", "False", "Not sure", "Skip"],
      correct: typeof q.correct_answer === 'string' ? parseInt(q.correct_answer) || 0 : (q.correct_answer || 0),
      explanation: q.explanation || 'No explanation provided'
    };
    
    currentSegment.questions.push(transformedQuestion);
    
    // Add visual context as concepts
    if (q.visual_context) {
      currentSegment.concepts.push(q.visual_context.substring(0, 50));
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
        explanation: 'This appears to be educational content based on the analysis.'
      }]
    });
  }
  
  return {
    title: "AI Generated Course",
    description: "Interactive course generated from YouTube video content using AI analysis.",
    duration: "30 minutes", // You could calculate this from total_duration if available
    segments: segments
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { youtubeUrl } = req.body;

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

    // Step 2: Call Supabase edge function
    const edgeResponse = await fetch(
      'https://nkqehqwbxkxrgecmgzuq.supabase.co/functions/v1/gemini-quiz-service',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          course_id: course.id,
          youtube_url: youtubeUrl,
          max_questions: 10,
          difficulty_level: 'medium',
          focus_topics: []
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
    console.log('✅ Questions generated:', edgeData.questions?.length || 0);

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

    return res.status(200).json({
      success: true,
      data: transformedData,
      course_id: course.id
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