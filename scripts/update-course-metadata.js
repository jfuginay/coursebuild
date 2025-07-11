#!/usr/bin/env node

/**
 * Script to update existing courses with:
 * 1. Real YouTube video titles (replacing placeholders)
 * 2. AI-generated descriptions from video summaries
 * 
 * Usage: node scripts/update-course-metadata.js [--dry-run]
 */

// Try to load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('⚠️  Note: dotenv not found, reading from process.env only');
}

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - support multiple environment variable options
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   process.env.SUPABASE_ANON_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Warning: Using ANON_KEY instead of SERVICE_ROLE_KEY.');
  console.warn('   Some operations may be restricted. For full access, use SERVICE_ROLE_KEY.');
  console.warn('');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

/**
 * Fetch YouTube metadata using oEmbed API
 */
async function fetchYouTubeMetadata(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch YouTube metadata for ${url}`);
      return null;
    }
    
    const data = await response.json();
    return {
      title: data.title,
      author_name: data.author_name,
      thumbnail_url: data.thumbnail_url
    };
  } catch (error) {
    console.error(`❌ Error fetching YouTube metadata for ${url}:`, error.message);
    return null;
  }
}

/**
 * Generate fallback title from URL
 */
function generateFallbackTitle(url) {
  const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  return videoId ? `YouTube Video (${videoId})` : 'YouTube Video';
}

/**
 * Check if a title is generic/placeholder
 */
function isGenericTitle(title) {
  if (!title) return true;
  
  const genericPatterns = [
    /^AI Generated Course/i,
    /^Video content analyzed successfully/i,
    /^YouTube Video \(/i,
    /^Course from http/i,
    /^Sample Course/i,
    /^Cached Course/i
  ];
  
  return genericPatterns.some(pattern => pattern.test(title));
}

/**
 * Check if a description is generic/placeholder
 */
function isGenericDescription(description) {
  if (!description) return true;
  
  const genericPatterns = [
    /Interactive course from .* - Learn through AI-generated questions/i,
    /AI-powered interactive course from YouTube video/i,
    /AI Generated Course/i,
    /Course loaded from previously analyzed video/i,
    /This is a sample course/i
  ];
  
  return genericPatterns.some(pattern => pattern.test(description));
}

/**
 * Update course titles
 */
async function updateCourseTitles() {
  console.log('\n📝 Updating course titles...\n');
  
  // Fetch all courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, youtube_url')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch courses:', error);
    return { updated: 0, total: 0 };
  }

  console.log(`📊 Found ${courses.length} total courses`);
  
  let updatedCount = 0;
  let skippedCount = 0;

  for (const course of courses) {
    // Check if title needs updating
    if (!isGenericTitle(course.title)) {
      skippedCount++;
      continue;
    }

    console.log(`\n🔄 Processing course ${course.id}:`);
    console.log(`   Current title: "${course.title}"`);
    console.log(`   YouTube URL: ${course.youtube_url}`);

    // Fetch YouTube metadata
    const metadata = await fetchYouTubeMetadata(course.youtube_url);
    
    let newTitle;
    let newDescription;
    
    if (metadata) {
      newTitle = metadata.title;
      newDescription = `Interactive course from "${metadata.author_name}" - Learn through AI-generated questions perfectly timed with the video content.`;
      console.log(`   ✅ Found YouTube title: "${newTitle}"`);
      console.log(`   ✅ Author: ${metadata.author_name}`);
    } else {
      newTitle = generateFallbackTitle(course.youtube_url);
      newDescription = 'AI-powered interactive course from YouTube video with perfectly timed questions to enhance learning.';
      console.log(`   ⚠️ Using fallback title: "${newTitle}"`);
    }

    if (!isDryRun) {
      // Update the course
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          title: newTitle,
          description: newDescription
        })
        .eq('id', course.id);

      if (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated successfully!`);
        updatedCount++;
      }
    } else {
      console.log(`   🔍 [DRY RUN] Would update to: "${newTitle}"`);
      updatedCount++;
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Title Update Summary:`);
  console.log(`   - Total courses: ${courses.length}`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Skipped (already have good titles): ${skippedCount}`);
  
  return { updated: updatedCount, total: courses.length };
}

/**
 * Update course descriptions with AI-generated summaries
 */
async function updateCourseDescriptions() {
  console.log('\n\n📝 Updating course descriptions with AI summaries...\n');
  
  // Fetch courses with generic descriptions
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, description, youtube_url')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch courses:', error);
    return { updated: 0, total: 0 };
  }

  let coursesNeedingUpdate = courses.filter(course => isGenericDescription(course.description));
  console.log(`📊 Found ${coursesNeedingUpdate.length} courses with generic descriptions`);
  
  let updatedCount = 0;
  let noTranscriptCount = 0;

  for (const course of coursesNeedingUpdate) {
    console.log(`\n🔄 Processing course ${course.id}:`);
    console.log(`   Current description: "${course.description?.substring(0, 60)}..."`);

    // Check if transcript exists
    const { data: transcript, error: transcriptError } = await supabase
      .from('video_transcripts')
      .select('video_summary')
      .eq('course_id', course.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (transcriptError || !transcript || !transcript.video_summary) {
      console.log(`   ⚠️ No transcript/summary available yet`);
      noTranscriptCount++;
      continue;
    }

    console.log(`   ✅ Found AI-generated summary: "${transcript.video_summary.substring(0, 60)}..."`);

    if (!isDryRun) {
      // Update the course description
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          description: transcript.video_summary
        })
        .eq('id', course.id);

      if (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated description successfully!`);
        updatedCount++;
      }
    } else {
      console.log(`   🔍 [DRY RUN] Would update description to AI summary`);
      updatedCount++;
    }
  }

  console.log(`\n📊 Description Update Summary:`);
  console.log(`   - Courses with generic descriptions: ${coursesNeedingUpdate.length}`);
  console.log(`   - Updated with AI summaries: ${updatedCount}`);
  console.log(`   - No transcript available: ${noTranscriptCount}`);
  
  return { updated: updatedCount, total: coursesNeedingUpdate.length };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Course Metadata Update Script');
  console.log('================================');
  
  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made');
  }
  
  try {
    // Update titles first
    const titleResults = await updateCourseTitles();
    
    // Then update descriptions
    const descriptionResults = await updateCourseDescriptions();
    
    // Final summary
    console.log('\n\n✅ Update Complete!');
    console.log('===================');
    console.log(`📊 Final Summary:`);
    console.log(`   - Titles updated: ${titleResults.updated}`);
    console.log(`   - Descriptions updated: ${descriptionResults.updated}`);
    
    if (isDryRun) {
      console.log('\n💡 This was a dry run. To apply changes, run without --dry-run flag');
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main(); 