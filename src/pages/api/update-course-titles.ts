import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { fetchYouTubeMetadata, generateFallbackTitle } from '@/utils/youtube';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all courses with placeholder titles
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id, title, youtube_url')
      .or('title.like.%AI Generated Course%,title.like.%YouTube Video%,title.like.%Course from http%,title.like.%Video content analyzed successfully%')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching courses:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }

    if (!courses || courses.length === 0) {
      return res.status(200).json({ 
        message: 'No courses with placeholder titles found',
        updated: 0 
      });
    }

    console.log(`Found ${courses.length} courses with placeholder titles`);

    let updatedCount = 0;
    const updateResults = [];

    // Update each course with proper title from YouTube
    for (const course of courses) {
      try {
        const videoMetadata = await fetchYouTubeMetadata(course.youtube_url);
        
        if (videoMetadata) {
          const newTitle = videoMetadata.title;
          const newDescription = `Interactive course from "${videoMetadata.author_name}" - Learn through AI-generated questions perfectly timed with the video content.`;
          
          const { error: updateError } = await supabase
            .from('courses')
            .update({
              title: newTitle,
              description: newDescription
            })
            .eq('id', course.id);

          if (updateError) {
            console.error(`Failed to update course ${course.id}:`, updateError);
            updateResults.push({
              id: course.id,
              success: false,
              error: updateError.message
            });
          } else {
            console.log(`✅ Updated course ${course.id}: "${course.title}" → "${newTitle}"`);
            updatedCount++;
            updateResults.push({
              id: course.id,
              success: true,
              oldTitle: course.title,
              newTitle: newTitle
            });
          }
        } else {
          // Use fallback title if metadata fetch fails
          const fallbackTitle = generateFallbackTitle(course.youtube_url);
          
          const { error: updateError } = await supabase
            .from('courses')
            .update({
              title: fallbackTitle,
              description: 'AI-powered interactive course from YouTube video with perfectly timed questions to enhance learning.'
            })
            .eq('id', course.id);

          if (!updateError) {
            updatedCount++;
            updateResults.push({
              id: course.id,
              success: true,
              oldTitle: course.title,
              newTitle: fallbackTitle,
              fallback: true
            });
          }
        }

        // Add a small delay to avoid rate limiting YouTube's oEmbed API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error processing course ${course.id}:`, error);
        updateResults.push({
          id: course.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.status(200).json({
      message: `Updated ${updatedCount} out of ${courses.length} courses`,
      updated: updatedCount,
      total: courses.length,
      results: updateResults
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to update course titles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 