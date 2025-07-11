import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test the edge function directly
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat-assistant`;
    
    const testMessage = "How does the process of machine learning work?";
    
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        message: testMessage,
        conversationHistory: [],
        courseContext: {
          courseId: 'test-visual-generation',
          currentVideoTime: 0,
          playedTranscriptSegments: [],
          totalSegments: 0
        },
        userContext: {
          sessionId: `test_${Date.now()}`
        }
      })
    });

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('Edge function error:', edgeResponse.status, errorText);
      return res.status(500).json({ 
        error: `Edge function error: ${edgeResponse.status}`,
        details: errorText
      });
    }

    const data = await edgeResponse.json();
    
    return res.status(200).json({
      success: true,
      testMessage,
      response: data.response,
      hasVisuals: !!data.visuals,
      visualsCount: data.visuals?.length || 0,
      visualContext: data.visualContext,
      visuals: data.visuals,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test visual generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 