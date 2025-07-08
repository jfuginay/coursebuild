import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Question ID is required' });
  }

  try {
    if (req.method === 'PATCH') {
      // Accept question - update accepted field to true
      const { error } = await supabase
        .from('questions')
        .update({ accepted: true })
        .eq('id', id);

      if (error) {
        console.error('Error accepting question:', error);
        return res.status(500).json({ 
          error: 'Failed to accept question',
          message: error.message 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Question accepted successfully'
      });

    } else if (req.method === 'DELETE') {
      // Reject question - delete from database
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error rejecting question:', error);
        return res.status(500).json({ 
          error: 'Failed to reject question',
          message: error.message 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Question rejected successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 