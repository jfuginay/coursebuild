import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'OPENAI_API_KEY not found in environment variables',
        hasKey: false
      });
    }

    // Test the API key with a simple request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Generate a simple Mermaid diagram showing TCP vs UDP. Return ONLY the Mermaid code.'
          }
        ],
        temperature: 0.5,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorText,
        hasKey: true,
        keyPrefix: apiKey.substring(0, 10) + '...'
      });
    }

    const data = await response.json();
    const mermaidCode = data.choices[0]?.message?.content || '';

    return res.status(200).json({
      success: true,
      hasKey: true,
      keyPrefix: apiKey.substring(0, 10) + '...',
      mermaidCode,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test OpenAI error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 