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
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    if (req.method === 'GET') {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching course:', error);
        return res.status(404).json({ 
          error: 'Course not found',
          message: error.message 
        });
      }

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      return res.status(200).json({
        success: true,
        course
      });
    }

    if (req.method === 'PATCH') {
      const { title, description } = req.body;

      if (!title && !description) {
        return res.status(400).json({ error: 'Title or description is required' });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;

      const { data: course, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating course:', error);
        return res.status(500).json({ 
          error: 'Failed to update course',
          message: error.message 
        });
      }

      return res.status(200).json({
        success: true,
        course
      });
    }

    if (req.method === 'DELETE') {
      // First, delete all associated questions
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('course_id', id);

      if (questionsError) {
        console.error('Error deleting questions:', questionsError);
        return res.status(500).json({ 
          error: 'Failed to delete associated questions',
          message: questionsError.message 
        });
      }

      // Then, delete the course
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (courseError) {
        console.error('Error deleting course:', courseError);
        return res.status(500).json({ 
          error: 'Failed to delete course',
          message: courseError.message 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Course and associated questions deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 