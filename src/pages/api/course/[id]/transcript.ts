import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  try {
    console.log('📄 Fetching transcript for course:', id);

    // Query the transcript_segments view
    const { data: segments, error } = await supabase
      .from('transcript_segments')
      .select('*')
      .eq('course_id', id)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ Error fetching transcript segments:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch transcript segments',
        details: error.message 
      });
    }

    if (!segments || segments.length === 0) {
      console.log('📄 No transcript segments found for course:', id);
      return res.status(200).json({ 
        success: true, 
        segments: [],
        message: 'No transcript segments found for this course'
      });
    }

    console.log('✅ Retrieved transcript segments:', segments.length);

    // Convert string timestamps to numbers for easier handling
    const processedSegments = segments.map(segment => ({
      ...segment,
      timestamp: segment.timestamp || '0',
      end_timestamp: segment.end_timestamp || '0'
    }));

    return res.status(200).json({
      success: true,
      segments: processedSegments,
      count: processedSegments.length
    });

  } catch (error) {
    console.error('❌ Unexpected error fetching transcript:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 