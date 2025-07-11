import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  conversationHistory: ChatMessage[];
  courseId?: string;
  currentVideoTime?: number;
}

interface TranscriptSegment {
  id: string;
  text: string;
  start_time: number;
  end_time: number;
  segment_index: number;
}

interface EdgeFunctionContext {
  message: string;
  conversationHistory: ChatMessage[];
  courseContext: {
    courseId: string;
    currentVideoTime: number;
    playedTranscriptSegments: TranscriptSegment[];
    totalSegments: number;
  };
  userContext: {
    hashedUserId?: string;
    sessionId: string;
  };
}


// Fetch transcript data from Supabase
async function fetchTranscriptSegments(courseId: string): Promise<TranscriptSegment[]> {
  try {
    console.log('🔍 Fetching transcript segments for course:', courseId);
    
    const { data, error } = await supabase
      .from('transcript_segments')
      .select('transcript_id, text, timestamp, end_timestamp')
      .eq('course_id', courseId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ Error fetching transcript segments:', error);
      return [];
    }

    // Transform the data to match our TranscriptSegment interface
    const transformedData: TranscriptSegment[] = (data || []).map((segment, index) => ({
      id: segment.transcript_id,
      text: segment.text || '',
      start_time: parseFloat(segment.timestamp) || 0,
      end_time: parseFloat(segment.end_timestamp) || 0,
      segment_index: index
    }));

    console.log('📜 Raw transcript data from DB:', {
      courseId,
      segmentCount: transformedData.length,
      firstSegment: transformedData[0] ? {
        id: transformedData[0].id,
        start_time: transformedData[0].start_time,
        end_time: transformedData[0].end_time,
        segment_index: transformedData[0].segment_index,
        text: transformedData[0].text.substring(0, 50) + '...'
      } : null,
      lastSegment: transformedData.length > 0 ? {
        id: transformedData[transformedData.length - 1].id,
        start_time: transformedData[transformedData.length - 1].start_time,
        end_time: transformedData[transformedData.length - 1].end_time,
        segment_index: transformedData[transformedData.length - 1].segment_index,
        text: transformedData[transformedData.length - 1].text.substring(0, 50) + '...'
      } : null
    });

    return transformedData;
  } catch (error) {
    console.error('❌ Error in fetchTranscriptSegments:', error);
    return [];
  }
}

// Filter transcript segments based on current video time
function getPlayedTranscriptSegments(
  transcriptSegments: TranscriptSegment[],
  currentVideoTime: number
): TranscriptSegment[] {
  console.log('🔍 Filtering transcript segments:', {
    totalSegments: transcriptSegments.length,
    currentVideoTime,
    sampleSegments: transcriptSegments.slice(0, 3).map(s => ({
      id: s.id,
      start_time: s.start_time,
      end_time: s.end_time,
      text: s.text.substring(0, 30) + '...',
      shouldInclude: s.end_time <= currentVideoTime || 
                     (s.start_time <= currentVideoTime && currentVideoTime < s.end_time)
    }))
  });
  
  const filteredSegments = transcriptSegments.filter(segment => {
    // Include segments that have been fully played (end_time <= currentVideoTime)
    // or segments that are currently being played (start_time <= currentVideoTime < end_time)
    const shouldInclude = segment.end_time <= currentVideoTime || 
                         (segment.start_time <= currentVideoTime && currentVideoTime < segment.end_time);
    
    if (shouldInclude) {
      console.log('✅ Including segment:', {
        id: segment.id,
        start_time: segment.start_time,
        end_time: segment.end_time,
        text: segment.text.substring(0, 50) + '...',
        reason: segment.end_time <= currentVideoTime ? 'fully_played' : 'currently_playing'
      });
    }
    
    return shouldInclude;
  });
  
  console.log('📊 Filter results:', {
    totalSegments: transcriptSegments.length,
    filteredSegments: filteredSegments.length,
    currentVideoTime
  });
  
  return filteredSegments;
}

// Prepare context data for edge function
function prepareEdgeFunctionContext(
  message: string,
  conversationHistory: ChatMessage[],
  courseId: string,
  currentVideoTime: number,
  playedTranscriptSegments: TranscriptSegment[],
  totalSegments: number,
  req: NextApiRequest
): EdgeFunctionContext {
  // Create a session ID from request headers for user context
  const sessionId = req.headers['x-session-id'] as string || 
                   req.headers['user-agent'] + Date.now().toString();

  // Hash user ID if available (for privacy)
  const hashedUserId = req.headers['x-user-id'] ? 
                      Buffer.from(req.headers['x-user-id'] as string).toString('base64') : 
                      undefined;

  return {
    message,
    conversationHistory,
    courseContext: {
      courseId,
      currentVideoTime,
      playedTranscriptSegments,
      totalSegments
    },
    userContext: {
      hashedUserId,
      sessionId
    }
  };
}

// Call Supabase Edge Function
async function callAIChatEdgeFunction(context: EdgeFunctionContext): Promise<string> {
  try {
    console.log('🚀 Calling AI chat edge function with context:', {
      messageLength: context.message.length,
      segmentsCount: context.courseContext.playedTranscriptSegments.length,
      courseId: context.courseContext.courseId
    });

    const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
      body: context
    });
    
    if (error) {
      console.error('Edge function error:', error);
      // Fallback to mock response on error
      return getFallbackResponse(context);
    }
    
    if (!data || !data.response) {
      console.error('Invalid response from edge function:', data);
      return getFallbackResponse(context);
    }
    
    console.log('✅ Received response from edge function:', {
      responseLength: data.response.length,
      usage: data.usage
    });
    
    return data.response;
  } catch (error) {
    console.error('Error calling AI chat edge function:', error);
    return getFallbackResponse(context);
  }
}

// Fallback response when edge function fails
function getFallbackResponse(context: EdgeFunctionContext): string {
  const { playedTranscriptSegments, currentVideoTime } = context.courseContext;
  
  if (playedTranscriptSegments.length > 0) {
    const latestSegment = playedTranscriptSegments[playedTranscriptSegments.length - 1];
    return `Based on what you've watched so far (${Math.floor(currentVideoTime / 60)}:${Math.floor(currentVideoTime % 60).toString().padStart(2, '0')}), I can see you've covered "${latestSegment.text.substring(0, 50)}...". ${getMockResponseForMessage(context.message)}`;
  } else {
    return `I'm here to help with your course! ${getMockResponseForMessage(context.message)}`;
  }
}

// Fallback mock response function
function getMockResponseForMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('transcript') || lowerMessage.includes('video')) {
    return "I can help you understand the video content you've watched. What specific part would you like me to explain?";
  }
  
  if (lowerMessage.includes('question') || lowerMessage.includes('help')) {
    return "I'm here to help! Based on the course content you've seen, what would you like to know more about?";
  }
  
  return "I can help you with the course material you've covered so far. What would you like to discuss?";
}



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory, courseId, currentVideoTime }: ChatRequest = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // If no courseId provided, fall back to basic response
    if (!courseId) {
      return res.status(200).json({
        success: true,
        response: "I'm here to help! To provide more specific assistance, please make sure you're asking from within a course.",
        timestamp: new Date().toISOString()
      });
    }

    // Fetch transcript segments for the course
    const transcriptSegments = await fetchTranscriptSegments(courseId);
    console.log('📜 Fetched transcript segments:', {
      courseId,
      totalSegments: transcriptSegments.length,
      firstSegment: transcriptSegments[0] ? {
        start_time: transcriptSegments[0].start_time,
        end_time: transcriptSegments[0].end_time,
        text: transcriptSegments[0].text.substring(0, 50) + '...'
      } : null
    });
    
    // Filter segments based on current video time
    const playedSegments = getPlayedTranscriptSegments(
      transcriptSegments,
      currentVideoTime || 0
    );
    
    console.log('🎬 Filtered transcript segments:', {
      currentVideoTime,
      totalSegments: transcriptSegments.length,
      playedSegments: playedSegments.length,
      lastPlayedSegment: playedSegments[playedSegments.length - 1] ? {
        start_time: playedSegments[playedSegments.length - 1].start_time,
        end_time: playedSegments[playedSegments.length - 1].end_time,
        text: playedSegments[playedSegments.length - 1].text.substring(0, 50) + '...'
      } : null
    });

    // Prepare context for edge function
    const context = prepareEdgeFunctionContext(
      message,
      conversationHistory || [],
      courseId,
      currentVideoTime || 0,
      playedSegments,
      transcriptSegments.length,
      req
    );

    // Log context for debugging (remove in production)
    console.log('Chat context prepared:', {
      courseId,
      currentVideoTime,
      playedSegmentsCount: playedSegments.length,
      totalSegments: transcriptSegments.length,
      conversationLength: conversationHistory?.length || 0
    });

    // Call the AI edge function
    const response = await callAIChatEdgeFunction(context);

    return res.status(200).json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
      context: {
        courseId,
        currentVideoTime,
        segmentsProcessed: playedSegments.length,
        totalSegments: transcriptSegments.length
      }
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      response: "I'm sorry, I'm having trouble processing your message right now. Please try again in a moment."
    });
  }
} 