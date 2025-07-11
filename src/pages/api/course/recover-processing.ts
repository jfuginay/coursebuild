import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    console.log(`🔧 Manual recovery triggered for course ${course_id}`);

    // Call the orchestrator to check and process any pending segments
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !apiKey) {
      return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    const orchestratorUrl = `${supabaseUrl}/functions/v1/orchestrate-segment-processing`;

    // First, check the status
    const checkResponse = await fetch(orchestratorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        course_id,
        check_only: true
      })
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      throw new Error(`Failed to check status: ${errorText}`);
    }

    const checkResult = await checkResponse.json();
    console.log('📊 Current status:', checkResult);

    // If not completed, trigger processing
    if (checkResult.status !== 'completed') {
      const processResponse = await fetch(orchestratorUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course_id,
          check_only: false
        })
      });

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        throw new Error(`Failed to trigger processing: ${errorText}`);
      }

      const processResult = await processResponse.json();
      console.log('🚀 Processing triggered:', processResult);

      return res.status(200).json({
        success: true,
        message: 'Recovery initiated',
        status_before: checkResult,
        action_taken: processResult
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Course already completed',
        status: checkResult
      });
    }

  } catch (error) {
    console.error('Recovery error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 