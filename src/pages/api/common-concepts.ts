import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConceptWithCourse {
  concept: string;
  course_id: string;
  course_title: string;
  youtube_url: string;
}

interface ConceptCount {
  concept: string;
  count: number;
  courses: Array<{
    course_id: string;
    course_title: string;
    youtube_url: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all key concepts from published courses with their course info
    const { data: conceptsData, error } = await supabase
      .from('transcript_key_concepts')
      .select('concept, course_id, courses!inner(id, title, youtube_url, published)')
      .eq('courses.published', true);

    if (error) {
      console.error('Error fetching concepts:', error);
      return res.status(500).json({ error: 'Failed to fetch concepts' });
    }

    if (!conceptsData || conceptsData.length === 0) {
      return res.status(200).json({ concepts: [] });
    }

    // Count occurrences of each concept and track courses
    const conceptMap = new Map<string, ConceptCount>();

    conceptsData.forEach((item: any) => {
      const concept = item.concept?.toLowerCase().trim();
      if (!concept) return;

      const course = {
        course_id: item.course_id,
        course_title: item.courses.title,
        youtube_url: item.courses.youtube_url
      };

      if (conceptMap.has(concept)) {
        const existing = conceptMap.get(concept)!;
        existing.count++;
        // Only add course if not already in the list
        if (!existing.courses.some(c => c.course_id === course.course_id)) {
          existing.courses.push(course);
        }
      } else {
        conceptMap.set(concept, {
          concept: item.concept, // Keep original case
          count: 1,
          courses: [course]
        });
      }
    });

    // Convert to array and sort by count (descending)
    const sortedConcepts = Array.from(conceptMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Get top 20 most common concepts

    return res.status(200).json({ 
      success: true,
      concepts: sortedConcepts 
    });

  } catch (error) {
    console.error('Error in common-concepts API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 