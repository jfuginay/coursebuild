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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Question ID is required' });
    }

    // Delete the question from the database
    const { data: question, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting question:', error);
      return res.status(500).json({ 
        error: 'Failed to reject question',
        message: error.message 
      });
    }

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Question rejected and deleted successfully',
      question
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 