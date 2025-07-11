import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Call edge function with a simple health check
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat-assistant`;
    
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        message: 'HEALTH_CHECK',
        conversationHistory: [],
        courseContext: {
          courseId: 'debug',
          currentVideoTime: 0,
          playedTranscriptSegments: [],
          totalSegments: 0
        },
        userContext: {
          sessionId: `debug_${Date.now()}`
        }
      })
    });

    const responseText = await edgeResponse.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { rawResponse: responseText };
    }

    return res.status(200).json({
      status: edgeResponse.status,
      statusText: edgeResponse.statusText,
      headers: Object.fromEntries(edgeResponse.headers.entries()),
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug edge function error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 