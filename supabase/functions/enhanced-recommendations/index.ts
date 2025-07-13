/**
 * Enhanced Course Recommendations Engine
 * Uses chat insights, performance data, wrong questions, and real YouTube videos for personalized recommendations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logOpenAICall } from './langsmith-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface SessionPerformanceData {
  sessionId: string;
  currentCourse: {
    id: string;
    title: string;
    youtube_url: string;
    completionPercentage: number;
  } | null;
  performance: {
    totalQuestionsAnswered: number;
    totalQuestionsCorrect: number;
    accuracy: number;
    wrongQuestions: Array<{
      question: string;
      userAnswer: string;
      correctAnswer: string;
      type: string;
      timestamp?: number;
      concept?: string;
      explanation?: string;
    }>;
    questionsByType: {
      [type: string]: {
        answered: number;
        correct: number;
      };
    };
  };
  recentCourses: Array<{
    courseId: string;
    title: string;
    youtube_url: string;
    completionPercentage: number;
    questionsAnswered: number;
    questionsCorrect: number;
  }>;
}

interface RecommendationRequest {
  userId?: string; // Now optional to support anonymous users
  courseId?: string;
  trigger: 'course_completion' | 'manual_request' | 'chat_conversation' | 'dashboard_load';
  requestedCount?: number;
  sessionData?: SessionPerformanceData; // New field for anonymous users
}

interface CourseRecommendation {
  course_id?: string;
  youtube_url: string;
  title: string;
  description: string;
  channel_name: string;
  duration: string;
  thumbnail_url: string;
  score: number;
  reasons: string[];
  progression_type?: 'series_continuation' | 'topic_advancement' | 'reinforcement' | 'prerequisite';
  difficulty_match: 'too_easy' | 'perfect' | 'challenging' | 'too_hard';
  interest_alignment: number;
  predicted_engagement: number;
  addresses_mistakes: string[]; // Which wrong answers this video helps with
}

interface RecommendationResponse {
  recommendations: CourseRecommendation[];
  recommendation_id: string;
  insights_used: number;
  profile_confidence: number;
  wrong_questions_considered: number;
}

interface YouTubeVideoDetails {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  duration: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, courseId, trigger, requestedCount = 5, sessionData }: RecommendationRequest = await req.json();
    
    console.log('🎯 Generating enhanced recommendations:', {
      userId,
      courseId,
      trigger,
      requestedCount,
      hasSessionData: !!sessionData,
      sessionAccuracy: sessionData?.performance?.accuracy
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle anonymous users with session data
    let userProfile, recentInsights, performanceData, courseHistory, wrongQuestions;
    
    if (userId) {
      // Logged-in user: gather data from database
      [userProfile, recentInsights, performanceData, courseHistory, wrongQuestions] = await Promise.all([
        getUserLearningProfile(supabaseClient, userId),
        getRecentChatInsights(supabaseClient, userId),
        getUserPerformanceData(supabaseClient, userId),
        getUserCourseHistory(supabaseClient, userId),
        courseId ? getWrongQuestionsFromCourse(supabaseClient, userId, courseId) : Promise.resolve([])
      ]);
    } else if (sessionData) {
      // Anonymous user: convert session data to the expected format
      userProfile = createProfileFromSession(sessionData);
      recentInsights = [];
      performanceData = convertSessionPerformance(sessionData);
      courseHistory = sessionData.recentCourses || [];
      wrongQuestions = convertSessionWrongQuestions(sessionData);
      
      console.log('📊 Anonymous user data prepared:', {
        accuracy: userProfile.overall_accuracy,
        wrongQuestionsCount: wrongQuestions.length,
        coursesViewed: courseHistory.length
      });
    } else {
      // No user data available
      throw new Error('Either userId or sessionData must be provided');
    }

    console.log('📊 Data gathered:', {
      hasProfile: !!userProfile,
      insightsCount: recentInsights.length,
      performanceRecords: performanceData.length,
      coursesCompleted: courseHistory.length,
      wrongQuestionsCount: wrongQuestions.length
    });

    // Generate initial recommendations using LLM
    const searchTerms = await generateSearchTermsWithLLM({
      userProfile,
      recentInsights,
      performanceData,
      courseHistory,
      wrongQuestions,
      currentCourseId: courseId,
      trigger,
      requestedCount
    });

    console.log('🔍 Generated search terms:', searchTerms);

    // Search for real YouTube videos using SerpAPI
    const videoResults = await searchYouTubeVideos(searchTerms);
    
    console.log(`📹 Found ${videoResults.length} video candidates`);

    // Get detailed information about each video
    const detailedVideos = await getYouTubeVideoDetails(videoResults);

    // Have LLM make final selection and ranking
    const recommendations = await selectFinalRecommendations({
      userProfile,
      recentInsights,
      wrongQuestions,
      videoOptions: detailedVideos,
      searchTerms,
      requestedCount,
      currentCourseContext: courseId ? await getCourseContext(supabaseClient, courseId) : null,
      sessionData: sessionData
    });

    // Store recommendation history only for logged-in users
    let recommendationId = 'anonymous-session';
    if (userId) {
      recommendationId = await storeRecommendation(
        supabaseClient,
        userId,
        recommendations,
        {
          trigger,
          userProfile,
          insightsUsed: recentInsights.length,
          wrongQuestionsUsed: wrongQuestions.length,
          performanceSnapshot: performanceData
        }
      );
    }

    const response: RecommendationResponse = {
      recommendations,
      recommendation_id: recommendationId,
      insights_used: recentInsights.length,
      profile_confidence: userProfile?.profile_confidence || 0.5,
      wrong_questions_considered: wrongQuestions.length
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getWrongQuestionsFromCourse(supabaseClient: any, userId: string, courseId: string) {
  console.log(`🔍 Fetching wrong questions for user: ${userId}, course: ${courseId}`);
  
  // First, let's check if user has any responses for this course
  const { data: allResponses, error: allError } = await supabaseClient
    .from('user_question_responses')
    .select('*')
    .eq('user_id', userId);
    
  console.log(`   Total responses for user: ${allResponses?.length || 0}`);
  
  // Check responses for this specific course
  const { data: courseResponses, error: courseRespError } = await supabaseClient
    .from('user_question_responses')
    .select(`
      *,
      questions!inner(course_id)
    `)
    .eq('user_id', userId);
    
  const thisCourseResponses = (courseResponses || []).filter(
    resp => resp.questions?.course_id === courseId
  );
  
  console.log(`   Responses for THIS course: ${thisCourseResponses.length}`);
  console.log(`   Of which are wrong: ${thisCourseResponses.filter(r => !r.is_correct).length}`);
  
  // Now get wrong answers with question details and options
  const { data, error } = await supabaseClient
    .from('user_question_responses')
    .select(`
      *,
      questions!inner(
        id,
        question,
        type,
        options,
        correct_answer,
        explanation,
        timestamp,
        metadata,
        course_id
      )
    `)
    .eq('user_id', userId)
    .eq('is_correct', false)
    .order('attempted_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching wrong questions:', error);
    return [];
  }

  // Filter by course_id after the join and parse options
  const courseWrongQuestions = (data || []).filter(
    response => response.questions?.course_id === courseId
  ).map(response => {
    // Parse options if they're stored as JSON string
    let parsedOptions = [];
    if (response.questions?.options) {
      try {
        parsedOptions = typeof response.questions.options === 'string' 
          ? JSON.parse(response.questions.options) 
          : response.questions.options;
      } catch (e) {
        console.warn('Failed to parse options:', e);
      }
    }
    
    return {
      ...response,
      questions: {
        ...response.questions,
        options: parsedOptions
      }
    };
  });

  console.log(`✅ Found ${data?.length || 0} total wrong answers across all courses`);
  console.log(`   Wrong answers for course ${courseId}: ${courseWrongQuestions.length}`);
  
  if (courseWrongQuestions.length > 0) {
    console.log('   Sample wrong question:', {
      question: courseWrongQuestions[0].questions?.question?.substring(0, 50) + '...',
      type: courseWrongQuestions[0].questions?.type,
      userAnswer: courseWrongQuestions[0].selected_answer,
      responseText: courseWrongQuestions[0].response_text
    });
  }

  return courseWrongQuestions;
}

async function generateSearchTermsWithLLM(context: any): Promise<string[]> {
  const {
    userProfile,
    recentInsights,
    performanceData,
    courseHistory,
    wrongQuestions,
    currentCourseId,
    trigger,
    requestedCount
  } = context;

  // Get current course details if available
  let currentCourseContext = null;
  if (currentCourseId) {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    currentCourseContext = await getCourseContext(supabaseClient, currentCourseId);
    
    if (currentCourseContext) {
      console.log(`📚 Current course context: ${currentCourseContext.title}`);
      
      // Log transcript data availability
      const hasTranscript = !!currentCourseContext.video_transcripts;
      const hasSummary = hasTranscript && !!currentCourseContext.video_transcripts.video_summary;
      const hasKeyConcepts = hasTranscript && currentCourseContext.video_transcripts.key_concepts && currentCourseContext.video_transcripts.key_concepts.length > 0;
      
      console.log(`   📄 Has transcript: ${hasTranscript}`);
      console.log(`   📝 Has summary: ${hasSummary}`);
      console.log(`   🔑 Has key concepts: ${hasKeyConcepts} (${hasKeyConcepts ? currentCourseContext.video_transcripts.key_concepts.length : 0})`);
      
      // If no transcript data, log a warning
      if (!hasTranscript) {
        console.warn(`   ⚠️  No transcript data found - course may have been generated before v5 pipeline`);
      }
    }
  }

  // Calculate performance on current course if available
  let currentCoursePerformance = null;
  let questionsAnsweredCount = 0;
  
  // For logged-in users, check database performance data
  if (currentCourseId && performanceData.length > 0) {
    const currentCourseQuestions = performanceData.filter(p => 
      p.questions?.course_id === currentCourseId
    );
    if (currentCourseQuestions.length > 0) {
      questionsAnsweredCount = currentCourseQuestions.length;
      const correct = currentCourseQuestions.filter(p => p.is_correct).length;
      currentCoursePerformance = (correct / currentCourseQuestions.length * 100).toFixed(0);
    }
  }
  
  // For anonymous users or when no performance data, check session/profile data
  if (currentCoursePerformance === null && userProfile) {
    // Check if we have overall performance data
    if (userProfile.total_questions_answered > 0) {
      questionsAnsweredCount = userProfile.total_questions_answered;
      currentCoursePerformance = (userProfile.overall_accuracy * 100).toFixed(0);
    }
  }

  // Build comprehensive prompt for search term generation
  const prompt = buildSearchTermPrompt(
    userProfile,
    recentInsights,
    performanceData,
    courseHistory,
    wrongQuestions,
    currentCourseId,
    currentCourseContext,
    trigger,
    requestedCount
  );

  // Call OpenAI for search terms using LangSmith logger
  const response = await logOpenAICall(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational recommendation system. Generate specific YouTube search terms based on user learning data and mistakes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000
    },
    `Enhanced Recommendations - Search Term Generation (${wrongQuestions.length} wrong questions, ${trigger} trigger)`
  );

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  // Log series detection if found
  if (result.series_detected) {
    console.log('📺 Series detected:', result.series_info);
  }

  return result.search_terms || [];
}

async function searchYouTubeVideos(searchTerms: string[]): Promise<any[]> {
  const SERPAPI_KEY = Deno.env.get('SERPAPI_API_KEY');
  if (!SERPAPI_KEY) {
    throw new Error('SERPAPI_API_KEY not configured');
  }

  const allVideos: any[] = [];
  
  // Search for videos using each search term
  for (const term of searchTerms.slice(0, 3)) { // Limit to 3 searches to control costs
    console.log(`🔍 Searching YouTube for: ${term}`);
    
    const query = encodeURIComponent(term);
    const serpApiUrl = `https://serpapi.com/search.json?engine=youtube&search_query=${query}&api_key=${SERPAPI_KEY}`;
    
    try {
      const response = await fetch(serpApiUrl);
      const data = await response.json();
      
      const videoResults = data.video_results || [];
      console.log(`📊 Found ${videoResults.length} videos for: ${term}`);
      
      // Filter and add videos
      const validVideos = videoResults
        .filter((v: any) => {
          if (!v.length || !v.link) return false;
          
          // Parse duration
          const [min, sec] = v.length.split(':').map(Number);
          const totalMinutes = (min || 0) + (sec || 0) / 60;
          
          // Exclude videos longer than 20 minutes
          if (totalMinutes > 20) {
            console.log(`   ⏭️ Skipping video (too long: ${v.length}): ${v.title?.substring(0, 50)}...`);
            return false;
          }
          
          // Minimum 2 minutes to ensure quality content
          if (totalMinutes < 2) {
            console.log(`   ⏭️ Skipping video (too short: ${v.length}): ${v.title?.substring(0, 50)}...`);
            return false;
          }
          
          return true;
        })
        .slice(0, 5) // Take top 5 from each search
        .map((v: any) => ({
          ...v,
          search_term: term
        }));
      
      console.log(`   ✅ ${validVideos.length} videos passed duration filter (2-20 minutes)`);
      allVideos.push(...validVideos);
    } catch (error) {
      console.error(`Error searching for term "${term}":`, error);
    }
  }
  
  // Remove duplicates based on video link
  const uniqueVideos = Array.from(
    new Map(allVideos.map(v => [v.link, v])).values()
  );
  
  console.log(`📹 Total unique videos after filtering: ${uniqueVideos.length}`);
  
  return uniqueVideos;
}

async function getYouTubeVideoDetails(videos: any[]): Promise<YouTubeVideoDetails[]> {
  const details: YouTubeVideoDetails[] = [];
  
  // Use YouTube oEmbed API for basic details (doesn't require API key)
  for (const video of videos) {
    try {
      const videoId = extractVideoId(video.link);
      if (!videoId) continue;
      
      // Get basic info from oEmbed
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(video.link)}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        details.push({
          videoId,
          title: data.title || video.title,
          description: video.description || '',
          channelTitle: data.author_name || video.channel?.name || '',
          duration: video.length || '',
          thumbnail: data.thumbnail_url || video.thumbnail || '',
          publishedAt: video.published_time || '',
          viewCount: video.views?.toString() || '0',
          tags: video.search_term ? [video.search_term] : []
        });
      }
    } catch (error) {
      console.error(`Error fetching details for video:`, error);
    }
  }
  
  return details;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

async function selectFinalRecommendations(context: any): Promise<CourseRecommendation[]> {
  const {
    userProfile,
    recentInsights,
    wrongQuestions,
    videoOptions,
    searchTerms,
    requestedCount,
    currentCourseContext,
    sessionData
  } = context;

  const selectionPrompt = buildFinalSelectionPrompt(
    userProfile,
    recentInsights,
    wrongQuestions,
    videoOptions,
    searchTerms,
    requestedCount,
    currentCourseContext,
    sessionData
  );

  // Call OpenAI for final selection using LangSmith logger
  const response = await logOpenAICall(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational curator. Select and rank the best YouTube videos for personalized learning based on user data and mistakes.'
        },
        {
          role: 'user',
          content: selectionPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2500
    },
    `Enhanced Recommendations - Video Selection (${videoOptions.length} candidates, ${wrongQuestions.length} mistakes to address)`
  );

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  // Transform the LLM selections into final recommendations
  return result.selected_videos.map((selection: any) => {
    const video = videoOptions.find((v: YouTubeVideoDetails) => v.videoId === selection.video_id);
    if (!video) return null;

    return {
      youtube_url: `https://www.youtube.com/watch?v=${video.videoId}`,
      title: video.title,
      description: selection.personalized_description || video.description,
      channel_name: video.channelTitle,
      duration: video.duration,
      thumbnail_url: video.thumbnail,
      score: selection.score,
      reasons: selection.reasons,
      difficulty_match: selection.difficulty_match,
      interest_alignment: selection.interest_alignment,
      predicted_engagement: selection.predicted_engagement,
      addresses_mistakes: selection.addresses_mistakes || [],
      progression_type: selection.progression_type
    };
  }).filter(Boolean);
}

function buildSearchTermPrompt(
  userProfile: any,
  recentInsights: any[],
  performanceData: any[],
  courseHistory: any[],
  wrongQuestions: any[],
  currentCourseId: string | undefined,
  currentCourseContext: any | null,
  trigger: string,
  requestedCount: number
): string {
  console.log('🔨 Building search term prompt with:', {
    hasProfile: !!userProfile,
    insightsCount: recentInsights?.length || 0,
    performanceCount: performanceData?.length || 0,
    courseHistoryCount: courseHistory?.length || 0,
    wrongQuestionsCount: wrongQuestions?.length || 0,
    hasCurrentCourse: !!currentCourseContext,
    profileConfidence: userProfile?.profile_confidence || 0
  });

  // Prepare comprehensive user data analysis
  const userDataAnalysis = prepareUserDataAnalysis(
    userProfile,
    recentInsights,
    performanceData,
    courseHistory,
    wrongQuestions
  );

  // Calculate performance on current course if available
  let currentCoursePerformance = null;
  let questionsAnsweredCount = 0;
  
  // For logged-in users, check database performance data
  if (currentCourseId && performanceData.length > 0) {
    const currentCourseQuestions = performanceData.filter(p => 
      p.questions?.course_id === currentCourseId
    );
    if (currentCourseQuestions.length > 0) {
      questionsAnsweredCount = currentCourseQuestions.length;
      const correct = currentCourseQuestions.filter(p => p.is_correct).length;
      currentCoursePerformance = (correct / currentCourseQuestions.length * 100).toFixed(0);
    }
  }
  
  // For anonymous users or when no performance data, check session/profile data
  if (currentCoursePerformance === null && userProfile) {
    // Check if we have overall performance data
    if (userProfile.total_questions_answered > 0) {
      questionsAnsweredCount = userProfile.total_questions_answered;
      currentCoursePerformance = (userProfile.overall_accuracy * 100).toFixed(0);
    }
  }

  let prompt = `Generate ${requestedCount + 2} specific YouTube search terms for educational videos based on this comprehensive user analysis.

TRIGGER: ${trigger}

`;

  // Current video context - critical for continuity and series detection
  if (currentCourseContext) {
    // Use video transcript data if available
    const videoSummary = currentCourseContext.video_transcripts?.video_summary || currentCourseContext.description;
    const keyConcepts = currentCourseContext.video_transcripts?.key_concepts || [];
    
    prompt += `JUST COMPLETED VIDEO:
Title: "${currentCourseContext.title}"
Topic Summary: ${videoSummary?.substring(0, 500)}...
${keyConcepts.length > 0 ? `Key Concepts: ${keyConcepts.join(', ')}` : ''}
YouTube URL: ${currentCourseContext.youtube_url}
User Performance: ${currentCoursePerformance ? `${currentCoursePerformance}% accuracy on ${questionsAnsweredCount} questions` : questionsAnsweredCount > 0 ? `Answered ${questionsAnsweredCount} questions` : 'No questions attempted'}

CRITICAL SERIES/PROGRESSION DETECTION:
1. Check if the title contains series indicators (Part X, Episode Y, Chapter Z, #N, etc.)
2. If it's part of a series:
   - HIGH PERFORMANCE (>80%): Search for the NEXT episode/part in the series
   - MEDIUM PERFORMANCE (50-80%): Mix of next episode and reinforcement content
   - LOW PERFORMANCE (<50%): Focus on review/prerequisite content before advancing
3. If NOT part of a series, identify the natural progression of the topic
4. Look for channel-specific series patterns in the title/description

Key requirement: The next videos MUST feel like natural continuations or related topics to this video.

`;
  }

  // Add comprehensive user analysis
  prompt += userDataAnalysis;

  prompt += `
SEARCH TERM GENERATION RULES:

1. SERIES PROGRESSION PRIORITY:
   ${currentCourseContext ? `
   - First, analyze if "${currentCourseContext.title}" is part of a series
   - Extract series name and current position (e.g., "Part 5" → search for "Part 6")
   - Include variations: "Part 6", "Episode 6", "Chapter 6", etc.
   - Also search for "[series name] part 6" or "[topic] part 6"` : ''}

2. PERFORMANCE-BASED PROGRESSION:
   ${currentCoursePerformance ? `
   - User scored ${currentCoursePerformance}% on current video
   ${parseInt(currentCoursePerformance) > 80 ? 
     '- ADVANCE: Focus on next level/part/advanced topics' :
     parseInt(currentCoursePerformance) > 50 ?
     '- MIXED: Balance between advancement and reinforcement' :
     '- REINFORCE: Focus on review, prerequisites, and foundational content'}` : 
   '- No performance data available, balance between advancement and review'}

3. NATURAL TOPIC PROGRESSION:
   - Identify the learning path (e.g., "basics" → "intermediate" → "advanced")
   - Consider typical course sequences in this domain
   - Look for "next steps" or "after learning X" type content

4. ANALYZE the user data to identify:
   - Knowledge gaps from wrong answers
   - Natural next topics based on current video
   - Difficulty level appropriate for the user
   - Content matching their learning style

5. GENERATE search terms that:
   - Prioritize series continuation if detected
   - Are specific and targeted (not generic)
   - Include difficulty indicators when relevant
   - Match the user's demonstrated preferences
   - Build upon what they just watched
   - Address their specific mistakes or struggles

6. FORMAT each search term to maximize YouTube search effectiveness:
   - Include topic + format (tutorial, explanation, course)
   - Add level indicators (beginner, intermediate, advanced)
   - Use specific terminology from their domain
   - Include channel name if series detected

Return search terms in this JSON format:
{
  "series_detected": true/false,
  "series_info": {
    "series_name": "detected series name if any",
    "current_part": "current episode/part number",
    "next_part": "next episode/part to search for"
  },
  "search_terms": [
    "specific search term 1 (prioritize series continuation)",
    "specific search term 2",
    "specific search term 3",
    "specific search term 4",
    "specific search term 5",
    "specific search term 6",
    "specific search term 7"
  ],
  "reasoning": "Brief explanation of why these search terms were chosen, including series detection logic"
}

Remember: Quality over quantity. Each search term should have a clear purpose based on the user analysis and progression logic.`;

  return prompt;
}

function prepareUserDataAnalysis(
  userProfile: any,
  recentInsights: any[],
  performanceData: any[],
  courseHistory: any[],
  wrongQuestions: any[]
): string {
  let analysis = 'COMPREHENSIVE USER ANALYSIS:\n\n';

  // Profile Summary
  if (userProfile) {
    analysis += `LEARNING PROFILE (Confidence: ${(userProfile.profile_confidence * 100).toFixed(0)}%):\n`;
    
    // Learning Style
    if (userProfile.learning_style && Object.keys(userProfile.learning_style).length > 0) {
      const topStyles = Object.entries(userProfile.learning_style)
        .filter(([_, score]: any) => score > 0.5)
        .sort(([_, a]: any, [__, b]: any) => b - a)
        .slice(0, 3);
      analysis += `- Primary Learning Styles: ${topStyles.map(([style, score]: any) => 
        `${style} (${(score * 100).toFixed(0)}%)`
      ).join(', ')}\n`;
    }

    // Difficulty Preference
    if (userProfile.preferred_difficulty) {
      const prefDiff = Object.entries(userProfile.preferred_difficulty)
        .sort(([_, a]: any, [__, b]: any) => b - a)[0];
      if (prefDiff) {
        analysis += `- Preferred Difficulty: ${prefDiff[0]} (${(prefDiff[1] as number * 100).toFixed(0)}%)\n`;
      }
    }

    // Struggling Concepts
    if (userProfile.struggling_concepts?.length > 0) {
      const recentStruggles = userProfile.struggling_concepts
        .sort((a: any, b: any) => b.severity - a.severity)
        .slice(0, 5);
      analysis += `- Top Struggling Concepts:\n`;
      recentStruggles.forEach((s: any) => {
        analysis += `  • ${s.concept} (severity: ${(s.severity * 100).toFixed(0)}%, `;
        if (s.performance_accuracy !== null && s.performance_accuracy !== undefined) {
          analysis += `accuracy: ${(s.performance_accuracy * 100).toFixed(0)}%`;
        }
        analysis += `)\n`;
      });
    }

    // Topic Interests
    if (userProfile.topic_interests && Object.keys(userProfile.topic_interests).length > 0) {
      const topInterests = Object.entries(userProfile.topic_interests)
        .filter(([_, score]: any) => score > 0.3)
        .sort(([_, a]: any, [__, b]: any) => b - a)
        .slice(0, 5);
      if (topInterests.length > 0) {
        analysis += `- Strong Interest Topics: ${topInterests.map(([topic, score]: any) =>
          `${topic} (${(score * 100).toFixed(0)}%)`
        ).join(', ')}\n`;
      }
    }

    // Engagement Metrics
    if (userProfile.engagement_metrics) {
      const metrics = userProfile.engagement_metrics;
      if (metrics.avg_session_duration) {
        analysis += `- Typical Session: ${Math.round(metrics.avg_session_duration / 60)} minutes\n`;
      }
      if (metrics.engagement_score) {
        analysis += `- Engagement Level: ${(metrics.engagement_score * 100).toFixed(0)}%\n`;
      }
    }
    
    analysis += '\n';
  }

  // Wrong Questions Analysis
  if (wrongQuestions && wrongQuestions.length > 0) {
    analysis += `RECENT MISTAKES (${wrongQuestions.length} wrong answers):\n`;
    const wrongConcepts = new Map<string, number>();
    
    wrongQuestions.slice(0, 10).forEach((wq, i) => {
      const q = wq.questions;
      analysis += `${i + 1}. ${q?.type || 'Unknown'} Question: "${q?.question?.substring(0, 100)}..."\n`;
      
      // Show the actual answer options and what user selected
      if (q?.type === 'multiple-choice' && q?.options && Array.isArray(q.options)) {
        analysis += `   Options:\n`;
        q.options.forEach((option: string, idx: number) => {
          const isCorrect = idx === q.correct_answer;
          // Check both response_text (for string answers) and selected_answer (for indices)
          const isUserAnswer = wq.response_text === option || idx === wq.selected_answer;
          analysis += `     ${idx + 1}. ${option}${isCorrect ? ' ✓ (correct)' : ''}${isUserAnswer ? ' ← (user selected)' : ''}\n`;
        });
      } else if (q?.type === 'true-false') {
        const tfOptions = ['True', 'False'];
        const correctIdx = q.correct_answer === 0 ? 0 : 1;
        // Use response_text if available, otherwise fall back to index
        const userAnswer = wq.response_text || tfOptions[wq.selected_answer] || 'Unknown';
        analysis += `   User answered: ${userAnswer}\n`;
        analysis += `   Correct answer: ${tfOptions[correctIdx]}\n`;
      } else if (q?.type === 'matching') {
        // For matching questions, parse the metadata to show the pairs
        analysis += `   Question Type: Matching pairs exercise\n`;
        
        // Try to parse matching pairs from metadata
        if (q?.metadata) {
          try {
            const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
            if (metadata.matching_pairs) {
              analysis += `   Correct pairs:\n`;
              metadata.matching_pairs.forEach((pair: any, idx: number) => {
                analysis += `     - ${pair.left} ↔ ${pair.right}\n`;
              });
            }
          } catch (e) {
            console.warn('Failed to parse matching metadata');
          }
        }
        
        // Show user's attempted matching
        if (wq.response_text) {
          analysis += `   User's attempt: Matched items (see detailed response)\n`;
        }
      } else if (q?.type === 'hotspot') {
        // For hotspot questions, show what was clicked
        analysis += `   Question Type: Visual identification (hotspot)\n`;
        
        // Parse metadata to find target objects
        if (q?.metadata) {
          try {
            const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
            if (metadata.target_objects) {
              analysis += `   Correct answer: Click on ${metadata.target_objects.join(' or ')}\n`;
            }
          } catch (e) {
            console.warn('Failed to parse hotspot metadata');
          }
        }
        
        // Show what user clicked
        if (wq.response_text) {
          // Extract just the label from response like "Apple under natural sunlight (0.161, 0.483)"
          const match = wq.response_text.match(/^(.+?)\s*\(/);
          const clickedItem = match ? match[1] : wq.response_text;
          analysis += `   User clicked: ${clickedItem}\n`;
        }
      } else if (q?.type === 'sequencing') {
        // For sequencing questions, show the correct order
        analysis += `   Question Type: Sequence ordering\n`;
        
        // Try to parse sequence items from metadata
        if (q?.metadata) {
          try {
            const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
            if (metadata.sequence_items) {
              analysis += `   Correct order:\n`;
              metadata.sequence_items.forEach((item: string, idx: number) => {
                analysis += `     ${idx + 1}. ${item}\n`;
              });
            }
          } catch (e) {
            console.warn('Failed to parse sequencing metadata');
          }
        }
        
        if (wq.response_text) {
          analysis += `   User's order: ${wq.response_text}\n`;
        }
      } else {
        // For other question types, show what we have
        const userAnswer = wq.response_text || wq.selected_answer;
        analysis += `   User answered: ${userAnswer || 'Unknown'}\n`;
        if (q?.correct_answer !== undefined && q?.correct_answer !== 1) {
          analysis += `   Correct answer: ${q.correct_answer}\n`;
        }
      }
      
      analysis += `   Explanation: ${q?.explanation?.substring(0, 150)}...\n\n`;
      
      // Extract concepts from explanation
      const words = (q?.explanation || '').toLowerCase().split(/\s+/);
      words.forEach((word: string) => {
        if (word.length > 5) {
          wrongConcepts.set(word, (wrongConcepts.get(word) || 0) + 1);
        }
      });
    });
    
    if (wrongConcepts.size > 0) {
      const topWrongConcepts = Array.from(wrongConcepts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([concept, _]) => concept);
      analysis += `Key concepts in mistakes: ${topWrongConcepts.join(', ')}\n\n`;
    }
  } else {
    // Always include the section, even if empty
    analysis += `RECENT MISTAKES: None found for this course\n\n`;
  }

  // Performance Summary
  if (performanceData.length > 0) {
    const totalQuestions = performanceData.length;
    const correctCount = performanceData.filter(p => p.is_correct).length;
    const accuracy = (correctCount / totalQuestions * 100).toFixed(1);
    
    // Question type performance
    const typePerformance = performanceData.reduce((acc: any, p: any) => {
      const type = p.questions?.type || 'unknown';
      if (!acc[type]) acc[type] = { correct: 0, total: 0 };
      acc[type].total++;
      if (p.is_correct) acc[type].correct++;
      return acc;
    }, {});
    
    analysis += `PERFORMANCE METRICS:\n`;
    analysis += `- Overall Accuracy: ${accuracy}% (${correctCount}/${totalQuestions})\n`;
    analysis += `- By Question Type:\n`;
    Object.entries(typePerformance).forEach(([type, stats]: any) => {
      const typeAccuracy = (stats.correct / stats.total * 100).toFixed(0);
      analysis += `  • ${type}: ${typeAccuracy}% (${stats.correct}/${stats.total})\n`;
    });
    
    // Recent performance trend
    const recentPerf = performanceData.slice(0, 20);
    const recentCorrect = recentPerf.filter(p => p.is_correct).length;
    const recentAccuracy = recentPerf.length > 0 ? (recentCorrect / recentPerf.length * 100).toFixed(0) : 0;
    analysis += `- Recent Trend: ${recentAccuracy}% in last ${recentPerf.length} questions\n\n`;
  }

  // Course History
  if (courseHistory.length > 0) {
    analysis += `RECENT LEARNING HISTORY:\n`;
    courseHistory.slice(0, 5).forEach((enrollment: any) => {
      const course = enrollment.courses;
      if (course) {
        analysis += `- "${course.title}": `;
        analysis += `${enrollment.completion_percentage || 0}% complete, `;
        analysis += `${enrollment.questions_answered || 0} questions answered\n`;
      }
    });
    analysis += '\n';
  }

  // Recent Insights
  if (recentInsights.length > 0) {
    analysis += `RECENT BEHAVIORAL INSIGHTS:\n`;
    const insightGroups = recentInsights.reduce((acc: any, insight) => {
      acc[insight.insight_type] = (acc[insight.insight_type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(insightGroups).forEach(([type, count]) => {
      analysis += `- ${type.replace(/_/g, ' ')}: ${count} occurrences\n`;
    });
    
    // Sample recent insights
    const sampleInsights = recentInsights.slice(0, 3);
    if (sampleInsights.length > 0) {
      analysis += `\nRecent Examples:\n`;
      sampleInsights.forEach((insight: any) => {
        analysis += `• ${insight.insight_content?.description || 'No description'}\n`;
      });
    }
  }

  return analysis;
}

function buildFinalSelectionPrompt(
  userProfile: any,
  recentInsights: any[],
  wrongQuestions: any[],
  videoOptions: YouTubeVideoDetails[],
  searchTerms: string[],
  requestedCount: number,
  currentCourseContext: any | null,
  sessionData: SessionPerformanceData | undefined
): string {
  const wrongQuestionDetails = wrongQuestions.map(wq => {
    const q = wq.questions;
    let userAnswerText = 'Unknown';
    let correctAnswerText = 'Unknown';
    
    // Get the actual answer texts based on question type
    if (q?.type === 'multiple-choice' && q?.options && Array.isArray(q.options)) {
      // Use response_text first (actual text), then try to get from options array
      userAnswerText = wq.response_text || q.options[wq.selected_answer] || `Option ${wq.selected_answer + 1}`;
      
      // Handle correct_answer which might be a string or number
      if (typeof q.correct_answer === 'string') {
        // If it's already the answer text, use it directly
        correctAnswerText = q.correct_answer;
      } else if (typeof q.correct_answer === 'number' && q.options[q.correct_answer]) {
        // If it's an index, get from options
        correctAnswerText = q.options[q.correct_answer];
      } else {
        correctAnswerText = q.correct_answer || 'Unknown';
      }
    } else if (q?.type === 'true-false') {
      const tfOptions = ['True', 'False'];
      // Use response_text first, then fallback to index lookup
      userAnswerText = wq.response_text || tfOptions[wq.selected_answer] || 'Unknown';
      
      // Handle correct_answer for true/false
      if (typeof q.correct_answer === 'string') {
        correctAnswerText = q.correct_answer;
      } else if (typeof q.correct_answer === 'number') {
        correctAnswerText = tfOptions[q.correct_answer === 0 ? 0 : 1];
      } else {
        correctAnswerText = 'Unknown';
      }
    } else if (q?.type === 'matching') {
      userAnswerText = 'Incorrect matching of pairs';
      correctAnswerText = 'See explanation for correct pairs';
      
      // Try to extract correct pairs from metadata
      if (q.metadata) {
        try {
          const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
          if (metadata.matching_pairs) {
            const pairs = metadata.matching_pairs.map((p: any) => `${p.left}↔${p.right}`).join(', ');
            correctAnswerText = `Correct pairs: ${pairs}`;
          }
        } catch (e) {}
      }
    } else if (q?.type === 'hotspot') {
      // Extract clicked item from response text
      if (wq.response_text) {
        const match = wq.response_text.match(/^(.+?)\s*\(/);
        userAnswerText = match ? `Clicked on: ${match[1]}` : `Clicked: ${wq.response_text}`;
      } else {
        userAnswerText = 'Clicked wrong area';
      }
      
      // Get target from metadata
      correctAnswerText = 'See explanation';
      if (q.metadata) {
        try {
          const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
          if (metadata.target_objects) {
            correctAnswerText = `Should click: ${metadata.target_objects.join(' or ')}`;
          }
        } catch (e) {}
      }
    } else if (q?.type === 'sequencing') {
      userAnswerText = 'Incorrect sequence order';
      correctAnswerText = 'See explanation for correct order';
      
      // Try to get correct sequence from metadata
      if (q.metadata) {
        try {
          const metadata = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
          if (metadata.sequence_items) {
            correctAnswerText = `Correct order: ${metadata.sequence_items.join(' → ')}`;
          }
        } catch (e) {}
      }
    } else {
      userAnswerText = wq.response_text || wq.selected_answer || 'Unknown';
      correctAnswerText = q.correct_answer || 'See explanation';
    }
    
    return {
      question: q.question,
      type: q.type,
      userAnswer: userAnswerText,
      correctAnswer: correctAnswerText,
      explanation: q.explanation,
      concept: q.metadata?.key_concepts || []
    };
  });

  // Calculate user's performance on this course
  let questionsAttempted = 0;
  let questionsCorrect = 0;
  let accuracy: string | null = null;
  
  // For anonymous users with session data
  if (sessionData) {
    questionsAttempted = sessionData.performance.totalQuestionsAnswered;
    questionsCorrect = sessionData.performance.totalQuestionsCorrect;
    accuracy = questionsAttempted > 0 ? ((questionsCorrect / questionsAttempted) * 100).toFixed(0) : null;
  } 
  // For logged-in users, calculate from wrong questions
  else if (wrongQuestions.length > 0) {
    // We only have wrong questions, so we need more context to calculate total
    // This is a limitation - we can only show the number of mistakes
    questionsAttempted = wrongQuestions.length; // This is minimum questions attempted
    accuracy = null; // Can't calculate without total questions
  }

  let prompt = `Select and rank the ${requestedCount} best YouTube videos from these options for personalized learning.

`;

  // Add current course context with performance
  if (currentCourseContext) {
    // Use video transcript data if available
    const videoSummary = currentCourseContext.video_transcripts?.video_summary || currentCourseContext.description;
    const keyConcepts = currentCourseContext.video_transcripts?.key_concepts || [];
    
    prompt += `JUST COMPLETED VIDEO:
- Title: "${currentCourseContext.title}"
- Topic Summary: ${videoSummary?.substring(0, 300)}...
${keyConcepts.length > 0 ? `- Key Concepts: ${keyConcepts.join(', ')}` : ''}
- User Performance: ${accuracy !== null ? 
    `${accuracy}% accuracy (${wrongQuestions.length} mistakes out of ${questionsAttempted} questions)` : 
    wrongQuestions.length > 0 ? 
    `${wrongQuestions.length} mistakes identified` : 
    'No questions attempted'}

SERIES/PROGRESSION DETECTION:
Analyze if this video is part of a series by looking for:
- Part/Episode/Chapter numbers in the title
- Sequential indicators (#1, #2, etc.)
- "Introduction", "Basics", "Advanced" progression markers
- Channel-specific series patterns

The recommended videos should naturally follow from or relate to this content.

`;
  }

  // Add user mistakes if any
  if (wrongQuestionDetails.length > 0) {
    prompt += `USER'S MISTAKES (Must Address):
${wrongQuestionDetails.slice(0, 10).map((wq, i) => 
  `${i+1}. [${wq.type}] "${wq.question}"
   User answered: "${wq.userAnswer}"
   Correct answer: "${wq.correctAnswer}"
   Why it matters: ${wq.explanation}
   Key concepts: ${Array.isArray(wq.concept) ? wq.concept.join(', ') : wq.concept}`
).join('\n\n')}

`;
  }

  prompt += `USER PROFILE:
- Learning Style: ${JSON.stringify(userProfile?.learning_style || {})}
- Struggling Concepts: ${userProfile?.struggling_concepts?.map((c: any) => c.concept).join(', ') || 'None identified'}
${accuracy ? `- Current Course Performance: ${accuracy}% accuracy` : ''}

AVAILABLE VIDEOS:
${videoOptions.map((video, i) => 
  `${i+1}. Video ID: ${video.videoId}
   Title: ${video.title}
   Channel: ${video.channelTitle}
   Duration: ${video.duration}
   Description: ${video.description.substring(0, 200)}...
   Search Term: ${video.tags.join(', ')}`
).join('\n\n')}

Select videos in this JSON format:
{
  "series_analysis": {
    "current_video_series": "identify if current video is part of a series",
    "recommended_continuation": "explain the natural progression"
  },
  "selected_videos": [
    {
      "video_id": "selected video ID",
      "score": 0.0-1.0,
      "reasons": [
        "Natural continuation of the series/topic",
        "Addresses mistake about X",
        "Appropriate for ${accuracy ? `${accuracy}%` : 'unknown'} performance level"
      ],
      "progression_type": "series_continuation|topic_advancement|reinforcement|prerequisite",
      "difficulty_match": "too_easy|perfect|challenging|too_hard",
      "interest_alignment": 0.0-1.0,
      "predicted_engagement": 0.0-1.0,
      "addresses_mistakes": [
        "Brief description of specific mistake 1 this video helps with",
        "Brief description of specific mistake 2 this video helps with"
      ],
      "personalized_description": "Why this video is perfect for this user"
    }
  ]
}

IMPORTANT: For the "addresses_mistakes" array:
- DO NOT use generic labels like "mistake 1", "mistake 2"
- Instead, provide brief, specific descriptions of what the user got wrong
- Examples:
  - "Confused CRI with color temperature"
  - "Incorrectly matched light sources to CRI values"
  - "Clicked wrong apple in visual identification"
  - "Mixed up warm/cool color terminology"
- Each entry should be a short phrase that clearly identifies the mistake

SELECTION CRITERIA WITH PROGRESSION PRIORITY:
`;

  if (currentCourseContext) {
    prompt += `0. SERIES CONTINUATION PRIORITY:
   - If the current video is part of a series (Part 5, Episode 3, etc.), prioritize the next in series
   - ${accuracy && parseInt(accuracy) > 80 ? 
       'HIGH PERFORMANCE: Strongly prioritize advancing to next part/episode' :
       accuracy && parseInt(accuracy) > 50 ?
       'MEDIUM PERFORMANCE: Balance between next episode and supplementary content' :
       'LOW PERFORMANCE: Consider review content before advancing in series'}
`;
  }

  prompt += `1. NATURAL PROGRESSION:
   - Even if not a formal series, identify the logical next step in learning
   - Consider: basics → intermediate → advanced progression
   - Look for "next steps", "after learning X", or "building on Y" content
2. PERFORMANCE-BASED SELECTION:
   ${accuracy ? `
   - User scored ${accuracy}% on current video
   ${parseInt(accuracy) > 80 ?
     '- Prioritize advancement and more challenging content' :
     parseInt(accuracy) > 50 ?
     '- Mix advancement with reinforcement of weak areas' :
     '- Focus on prerequisites and foundational content'}` :
   '- No performance data - balance advancement and review'}
3. DURATION PREFERENCE: Prioritize shorter videos (3-15 minutes ideal)
4. MUST prioritize videos that address the user's specific mistakes
5. Match difficulty to user's current level and performance
6. Align with learning style preferences
7. Consider video quality (channel reputation, clarity)
8. Prefer comprehensive explanations for concepts user struggled with
9. Ensure logical progression - avoid jumping too far ahead or unnecessary repetition

IMPORTANT RULES:
- SERIES VIDEOS GET HIGHEST PRIORITY when performance is good (>80%)
- Natural topic progression is key - videos should feel like a learning journey
- All videos in the list are already filtered to be 20 minutes or less
- Shorter videos (<10 min) should score higher than longer ones if content quality is similar`;

  return prompt;
}

// Keep all the existing helper functions
async function getUserLearningProfile(supabaseClient: any, userId: string) {
  console.log(`🔍 Fetching learning profile for user: ${userId}`);
  
  const { data, error } = await supabaseClient
    .from('user_learning_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`📝 No profile found, initializing from existing data...`);
      
      // Initialize profile from existing user data
      const { data: initialized, error: initError } = await supabaseClient
        .functions.invoke('initialize-learning-profile', {
          body: { userId }
        });
      
      if (initError || !initialized?.profile) {
        console.error('❌ Error initializing profile:', initError);
        return null;
      }
      
      console.log(`✅ Profile initialized successfully`);
      return initialized.profile;
    } else {
      console.error('❌ Error fetching learning profile:', error);
    }
    return null;
  }

  console.log(`✅ Found learning profile:`, {
    hasLearningStyle: !!data?.learning_style,
    strugglingConceptsCount: data?.struggling_concepts?.length || 0,
    topicInterestsCount: Object.keys(data?.topic_interests || {}).length,
    profileConfidence: data?.profile_confidence,
    totalInsightsProcessed: data?.total_insights_processed
  });

  return data;
}

async function getRecentChatInsights(supabaseClient: any, userId: string) {
  console.log(`🔍 Fetching chat insights for user: ${userId}`);
  
  const { data, error } = await supabaseClient
    .from('chat_insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ Error fetching chat insights:', error);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} chat insights`);
  if (data && data.length > 0) {
    console.log('   Recent insight types:', data.slice(0, 5).map(i => i.insight_type).join(', '));
  }

  return data || [];
}

async function getUserPerformanceData(supabaseClient: any, userId: string) {
  console.log(`🔍 Fetching performance data for user: ${userId}`);
  
  const { data, error } = await supabaseClient
    .from('user_question_responses')
    .select(`
      *,
      questions!inner(
        course_id,
        type,
        timestamp
      )
    `)
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Error fetching performance data:', error);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} performance records`);
  if (data && data.length > 0) {
    const correctCount = data.filter(d => d.is_correct).length;
    console.log(`   Accuracy: ${(correctCount / data.length * 100).toFixed(1)}%`);
  }

  return data || [];
}

async function getUserCourseHistory(supabaseClient: any, userId: string) {
  console.log(`🔍 Fetching course history for user: ${userId}`);
  
  const { data, error } = await supabaseClient
    .from('user_course_enrollments')
    .select(`
      *,
      courses!inner(
        id,
        title,
        description,
        created_by
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching course history:', error);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} course enrollments`);
  if (data && data.length > 0) {
    console.log('   Recent courses:', data.slice(0, 3).map(e => e.courses?.title).join(', '));
  }

  return data || [];
}

async function getCourseContext(supabaseClient: any, courseId: string) {
  console.log(`🔍 Fetching context for course: ${courseId}`);
  
  // Fetch course with video transcript data
  const { data, error } = await supabaseClient
    .from('courses')
    .select(`
      *,
      video_transcripts (
        video_summary,
        key_concepts_timeline
      )
    `)
    .eq('id', courseId)
    .single();

  if (error) {
    console.error('❌ Error fetching course context:', error);
    return null;
  }
  
  // Handle the array response - get the first transcript if available
  let transcriptData = null;
  if (data.video_transcripts && Array.isArray(data.video_transcripts) && data.video_transcripts.length > 0) {
    transcriptData = data.video_transcripts[0];
  }
  
  // Extract key concepts from the timeline
  let keyConcepts: string[] = [];
  if (transcriptData?.key_concepts_timeline) {
    try {
      const timeline = transcriptData.key_concepts_timeline;
      if (Array.isArray(timeline)) {
        keyConcepts = timeline.map((item: any) => item.concept).filter(Boolean);
      }
    } catch (e) {
      console.warn('Failed to parse key_concepts_timeline:', e);
    }
  }
  
  console.log(`✅ Found course context:`, {
    title: data.title,
    description: data.description,
    youtube_url: data.youtube_url,
    hasTranscript: !!transcriptData,
    hasSummary: !!transcriptData?.video_summary,
    keyConcepts: keyConcepts.length
  });
  
  // Return the data with parsed key concepts and normalized transcript structure
  return {
    ...data,
    video_transcripts: transcriptData ? {
      video_summary: transcriptData.video_summary,
      key_concepts_timeline: transcriptData.key_concepts_timeline,
      key_concepts: keyConcepts // Add parsed concepts for easier access
    } : null
  };
}

async function storeRecommendation(
  supabaseClient: any,
  userId: string,
  recommendations: CourseRecommendation[],
  context: any
): Promise<string> {
  const { data, error } = await supabaseClient
    .from('recommendation_history')
    .insert({
      user_id: userId,
      recommended_courses: recommendations,
      recommendation_context: {
        trigger: context.trigger,
        algorithm_version: '4.2', // Updated version for series progression
        user_state: {
          profile_confidence: context.userProfile?.profile_confidence || 0.5,
          insights_count: context.insightsUsed,
          wrong_questions_count: context.wrongQuestionsUsed
        }
      },
      insights_snapshot: {
        learning_style: context.userProfile?.learning_style,
        struggling_concepts: context.userProfile?.struggling_concepts,
        topic_interests: context.userProfile?.topic_interests
      },
      performance_snapshot: {
        recent_accuracy: calculateRecentAccuracy(context.performanceSnapshot),
        engagement_level: calculateEngagementLevel(context.performanceSnapshot),
        wrong_questions_addressed: context.wrongQuestionsUsed
      }
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error storing recommendation:', error);
    return 'error';
  }

  return data.id;
}

function calculateRecentAccuracy(performanceData: any[]): number {
  if (!performanceData || performanceData.length === 0) return 0;
  const correct = performanceData.filter(p => p.is_correct).length;
  return correct / performanceData.length;
}

function calculateEngagementLevel(performanceData: any[]): number {
  if (!performanceData || performanceData.length === 0) return 0;
  const avgTimePerQuestion = performanceData.reduce((sum, p) => sum + (p.time_taken || 0), 0) / performanceData.length;
  const engagementScore = Math.min(1, avgTimePerQuestion / 30);
  return engagementScore;
}

// Helper functions to convert session data to the expected format

function createProfileFromSession(sessionData: SessionPerformanceData): any {
  const { performance } = sessionData;
  
  return {
    user_id: sessionData.sessionId,
    overall_accuracy: performance.accuracy / 100, // Convert percentage to decimal
    total_questions_answered: performance.totalQuestionsAnswered,
    total_questions_correct: performance.totalQuestionsCorrect,
    profile_confidence: Math.min(performance.totalQuestionsAnswered / 50, 1), // Build confidence based on questions answered
    learning_style: {
      visual_preference: 0.5, // Default values for anonymous users
      reading_preference: 0.5,
      interactive_preference: 0.7, // Higher since they're using interactive quizzes
      structured_learning: 0.6
    },
    performance_by_type: performance.questionsByType,
    updated_at: new Date().toISOString()
  };
}

function convertSessionPerformance(sessionData: SessionPerformanceData): any[] {
  // Convert recent courses to performance data format
  return sessionData.recentCourses.map(course => ({
    course_id: course.courseId,
    course_title: course.title,
    questions_answered: course.questionsAnswered,
    questions_correct: course.questionsCorrect,
    accuracy: course.questionsCorrect / Math.max(course.questionsAnswered, 1),
    completion_percentage: course.completionPercentage,
    created_at: new Date().toISOString() // Anonymous sessions don't have timestamps
  }));
}

function convertSessionWrongQuestions(sessionData: SessionPerformanceData): any[] {
  return sessionData.performance.wrongQuestions.map((wq, index) => ({
    id: `session-wrong-${index}`,
    questions: {
      question: wq.question,
      type: wq.type,
      timestamp: wq.timestamp,
      options: [], // Options not stored in session data
      correct_answer: wq.correctAnswer, // Add the correct answer from session
      explanation: wq.explanation || wq.concept || '', // Use explanation or concept as fallback
      metadata: {} // Empty metadata for anonymous users
    },
    selected_answer: wq.userAnswer,
    response_text: wq.userAnswer,
    is_correct: false
  }));
}