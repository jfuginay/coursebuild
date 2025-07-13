import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/check-and-publish-course`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'apikey': apiKey!
        },
        body: JSON.stringify({ course_id })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Check and publish error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to check course status',
        details: errorText 
      });
    }

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 