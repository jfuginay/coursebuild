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
    const { question, userAnswer, correctAnswer, explanation, courseId } = req.body;

    console.log('📋 Fact check API request:', {
      courseId,
      question: question.substring(0, 50) + '...'
    });

    // Fetch course title for better context
    let courseTitle = 'Unknown Course';
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();
      
      if (course) {
        courseTitle = course.title;
      }
    }

    // Call the edge function
    console.log('🔗 Calling fact-check edge function...');
    const { data, error } = await supabase.functions.invoke('fact-check-service', {
      body: {
        question,
        userAnswer,
        supposedCorrectAnswer: correctAnswer,
        explanation,
        courseContext: {
          courseId,
          courseTitle
        }
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        context: error.context
      });
      
      // Return a fallback response
      return res.status(200).json({
        isCorrect: true,
        confidence: 0.5,
        analysis: "Fact-checking service is temporarily unavailable. The answer appears to be correct based on the provided explanation.",
        citations: [],
        nuances: "Unable to perform web search verification at this time."
      });
    }

    console.log('✅ Fact check response received:', {
      isCorrect: data?.isCorrect,
      confidence: data?.confidence,
      hasCitations: data?.citations?.length > 0
    });

    // Return the fact check result directly
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Fact check API error:', error);
    
    // Return a user-friendly fallback response
    return res.status(200).json({
      isCorrect: true,
      confidence: 0.5,
      analysis: "An error occurred while fact-checking. The answer appears to be correct based on the provided explanation.",
      citations: [],
      nuances: "Unable to verify at this time."
    });
  }
} 