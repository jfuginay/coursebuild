import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory, courseId, currentVideoTime } = req.body;

    console.log('📥 Chat API received request:', {
      message: message.substring(0, 50) + '...',
      courseId,
      currentVideoTime,
      conversationHistoryLength: conversationHistory?.length || 0
    });

    // Get transcript segments for the course if courseId is provided
    let playedTranscriptSegments = [];
    let totalSegments = 0;

    if (courseId) {
      // Fetch transcript segments for this course
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('video_transcripts')
        .select('full_transcript')
        .eq('course_id', courseId)
        .single();

      if (!transcriptError && transcriptData?.full_transcript) {
        const allSegments = transcriptData.full_transcript;
        totalSegments = allSegments.length;
        
        // Filter segments that have been watched (up to current time)
        // Fix: Use 'timestamp' field instead of 'start_time' to match DB schema
        playedTranscriptSegments = allSegments.filter((segment: any) => {
          const segmentTimestamp = parseInt(segment.timestamp || 0);
          return segmentTimestamp <= currentVideoTime;
        });
        
        console.log('📄 Loaded transcript context:', {
          totalSegments,
          playedSegments: playedTranscriptSegments.length,
          currentTime: currentVideoTime,
          firstSegment: playedTranscriptSegments[0] ? {
            timestamp: playedTranscriptSegments[0].timestamp,
            text: playedTranscriptSegments[0].text?.substring(0, 50) + '...'
          } : null
        });
      } else {
        console.warn('⚠️ No transcript found for course:', courseId);
        console.warn('  Error:', transcriptError);
      }
    }

    // Call the enhanced AI chat assistant edge function
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat-assistant`;
    
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
      message,
        conversationHistory: conversationHistory || [],
        courseContext: {
          courseId: courseId || 'unknown',
          currentVideoTime: currentVideoTime || 0,
          playedTranscriptSegments,
          totalSegments
        },
        userContext: {
          sessionId: `session_${Date.now()}`
        }
      })
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('❌ Edge function error:', edgeResponse.status, errorText);
      throw new Error(`Edge function error: ${edgeResponse.status}`);
    }

    const data = await edgeResponse.json();
    
    console.log('✅ Edge function response:', {
      success: data.success,
      responseLength: data.response?.length,
      hasVisuals: !!data.visuals,
      visualsCount: data.visuals?.length || 0,
      visualContext: data.visualContext
    });

    // Return the enhanced response with visuals
    return res.status(200).json({
      response: data.response,
      visuals: data.visuals,
      visualContext: data.visualContext,
      usage: data.usage
    });

  } catch (error) {
    console.error('❌ Chat API error:', error);
    
    // Fallback response without visuals
    return res.status(200).json({
      response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      visuals: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 