import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logOpenAICall } from '../quiz-generation-v5/utils/langsmith-logger.ts';

serve(async (req) => {
  try {
    const { userId, forceUpdate = false } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if profile exists and if we should update it
    const { data: existingProfile } = await supabaseClient
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingProfile && !forceUpdate) {
      console.log('✅ Profile already exists, skipping initialization');
      return new Response(
        JSON.stringify({ 
          message: 'Profile already exists',
          profile: existingProfile 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 Initializing learning profile for user:', userId);

    // Gather all existing user data
    const userData = await gatherUserData(supabaseClient, userId);
    
    // Use LLM to analyze patterns and create initial profile
    const initialProfile = await analyzeUserDataWithLLM(userData);
    
    // Store or update the profile
    const { data: profile, error } = await supabaseClient
      .from('user_learning_profiles')
      .upsert({
        user_id: userId,
        ...initialProfile,
        profile_version: 1,
        total_insights_processed: 0,
        profile_confidence: calculateInitialConfidence(userData),
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Profile initialized successfully');
    return new Response(
      JSON.stringify({ 
        success: true,
        profile 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error initializing profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function gatherUserData(supabaseClient: any, userId: string) {
  console.log('📊 Gathering user data...');
  
  // Fetch all relevant user data in parallel
  const [
    courseEnrollments,
    questionResponses,
    createdCourses,
    courseRatings,
    userSessions
  ] = await Promise.all([
    // Get courses the user has watched with video metadata
    supabaseClient
      .from('user_course_enrollments')
      .select(`
        *,
        courses!inner(
          id,
          title,
          description,
          youtube_url,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    // Get question responses with full question context
    supabaseClient
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
          bloom_level
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    // Get courses created by the user
    supabaseClient
      .from('courses')
      .select('*')
      .eq('created_by', userId)
      .eq('published', true),

    // Get user's course ratings
    supabaseClient
      .from('user_course_ratings')
      .select(`
        *,
        courses!inner(
          title,
          description
        )
      `)
      .eq('user_id', userId),

    // Get user session patterns
    supabaseClient
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  // Process video metadata from watched courses
  const videoMetadata = await extractVideoMetadata(
    courseEnrollments.data || [],
    supabaseClient
  );

  return {
    courseEnrollments: courseEnrollments.data || [],
    questionResponses: questionResponses.data || [],
    createdCourses: createdCourses.data || [],
    courseRatings: courseRatings.data || [],
    userSessions: userSessions.data || [],
    videoMetadata
  };
}

async function extractVideoMetadata(enrollments: any[], supabaseClient: any) {
  console.log('🎥 Extracting video metadata...');
  
  const videoIds = enrollments
    .map(e => extractVideoId(e.courses?.youtube_url))
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  // Get YouTube metadata (this could be enhanced with actual YouTube API calls)
  // For now, we'll use course titles and descriptions
  return enrollments.map(e => ({
    courseId: e.course_id,
    title: e.courses?.title,
    description: e.courses?.description,
    completionRate: e.completion_percentage || 0,
    questionsAnswered: e.questions_answered || 0,
    timeSpent: e.time_spent_seconds || 0
  }));
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

async function analyzeUserDataWithLLM(userData: any) {
  console.log('🤖 Analyzing user data with LLM...');
  
  // Prepare analysis summary
  const analysisSummary = prepareAnalysisSummary(userData);
  
  const requestBody = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert educational data analyst. Analyze user learning patterns to create a comprehensive learning profile. 
        Focus on identifying learning preferences, topic interests, struggling areas, and mastered concepts based on actual behavior data.`
      },
      {
        role: "user",
        content: `Analyze this user's learning data and create an initial learning profile:

${analysisSummary}

Generate a learning profile in this JSON format:
{
  "learning_style": {
    "visual": 0.0-1.0,
    "sequential": 0.0-1.0,
    "conceptual": 0.0-1.0,
    "practical": 0.0-1.0,
    "collaborative": 0.0-1.0,
    "independent": 0.0-1.0
  },
  "preferred_difficulty": {
    "beginner": 0.0-1.0,
    "intermediate": 0.0-1.0,
    "advanced": 0.0-1.0
  },
  "topic_interests": {
    "topic_name": 0.0-1.0
  },
  "struggling_concepts": [
    {
      "concept": "concept name",
      "severity": 0.0-1.0,
      "last_seen": "ISO date",
      "frequency": number
    }
  ],
  "mastered_concepts": [
    {
      "concept": "concept name",
      "confidence": 0.0-1.0,
      "last_demonstrated": "ISO date"
    }
  ],
  "stated_goals": [],
  "engagement_metrics": {
    "avg_session_duration": seconds,
    "questions_per_session": number,
    "clarification_rate": 0.0-1.0,
    "frustration_events": 0,
    "success_celebrations": 0
  },
  "time_preferences": {
    "preferred_session_length": minutes,
    "best_time_of_day": "morning|afternoon|evening|night",
    "frequency": "daily|weekly|occasional"
  },
  "content_preferences": {
    "video": 0.0-1.0,
    "text": 0.0-1.0,
    "interactive": 0.0-1.0,
    "audio": 0.0-1.0
  }
}

Base your analysis on:
1. Question response patterns (accuracy, time taken, types)
2. Course completion rates and engagement
3. Types of videos watched and topics covered
4. Course creation patterns (if any)
5. Session behavior and timing patterns
6. Rating patterns and preferences

Be data-driven and avoid assumptions without evidence.`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2000
  };

  const response = await logOpenAICall(
    'https://api.openai.com/v1/chat/completions',
    requestBody,
    `Initialize Learning Profile - User ${userData.userId || 'Unknown'}`
  );

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

function prepareAnalysisSummary(userData: any): string {
  const { 
    courseEnrollments, 
    questionResponses, 
    createdCourses, 
    courseRatings, 
    userSessions,
    videoMetadata 
  } = userData;

  // Calculate key metrics
  const totalQuestions = questionResponses.length;
  const correctAnswers = questionResponses.filter((r: any) => r.is_correct).length;
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(1) : 0;

  // Question type analysis
  const questionTypes = questionResponses.reduce((acc: any, r: any) => {
    const type = r.questions?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Topic analysis from courses
  const topics = new Map();
  courseEnrollments.forEach((e: any) => {
    const title = e.courses?.title || '';
    const words = title.toLowerCase().split(/\s+/);
    words.forEach((word: string) => {
      if (word.length > 4) { // Simple topic extraction
        topics.set(word, (topics.get(word) || 0) + 1);
      }
    });
  });

  // Session patterns
  const avgSessionLength = userSessions.length > 0
    ? userSessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0) / userSessions.length
    : 0;

  // Time of day analysis
  const hourCounts = userSessions.reduce((acc: any, s: any) => {
    const hour = new Date(s.created_at).getHours();
    const period = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    acc[period] = (acc[period] || 0) + 1;
    return acc;
  }, {});

  // Wrong answer analysis
  const wrongAnswers = questionResponses
    .filter((r: any) => !r.is_correct)
    .map((r: any) => ({
      question: r.questions?.question,
      type: r.questions?.type,
      explanation: r.questions?.explanation
    }));

  return `USER LEARNING DATA ANALYSIS:

COURSE ENGAGEMENT (${courseEnrollments.length} courses):
${courseEnrollments.slice(0, 10).map((e: any) => 
  `- "${e.courses?.title}": ${e.completion_percentage || 0}% complete, ${e.questions_answered || 0} questions answered`
).join('\n')}

QUESTION PERFORMANCE (${totalQuestions} total):
- Overall accuracy: ${accuracy}%
- Question types: ${JSON.stringify(questionTypes)}
- Average response time: ${calculateAvgResponseTime(questionResponses)}ms

WRONG ANSWERS (${wrongAnswers.length} mistakes):
${wrongAnswers.slice(0, 5).map((w: any) => 
  `- ${w.type}: "${w.question?.substring(0, 100)}..."`
).join('\n')}

VIDEO WATCHING PATTERNS:
${videoMetadata.slice(0, 5).map((v: any) => 
  `- "${v.title}": ${v.completionRate}% watched, ${Math.floor(v.timeSpent / 60)} minutes`
).join('\n')}

SESSION BEHAVIOR:
- Average session: ${Math.floor(avgSessionLength / 60)} minutes
- Time preferences: ${JSON.stringify(hourCounts)}
- Total sessions: ${userSessions.length}

COURSE CREATIONS: ${createdCourses.length} courses created
${createdCourses.slice(0, 3).map((c: any) => 
  `- "${c.title}"`
).join('\n')}

RATINGS GIVEN: ${courseRatings.length} courses rated
${courseRatings.slice(0, 3).map((r: any) => 
  `- ${r.rating}/5 stars: "${r.courses?.title}"`
).join('\n')}`;
}

function calculateAvgResponseTime(responses: any[]): number {
  const timings = responses
    .map((r: any) => r.response_time_ms)
    .filter((t: any) => t && t > 0);
  
  return timings.length > 0
    ? Math.round(timings.reduce((a: number, b: number) => a + b, 0) / timings.length)
    : 0;
}

function calculateInitialConfidence(userData: any): number {
  // Calculate confidence based on amount of data available
  const dataPoints = [
    userData.courseEnrollments.length * 2,
    userData.questionResponses.length,
    userData.courseRatings.length * 3,
    userData.userSessions.length * 0.5,
    userData.createdCourses.length * 5
  ];
  
  const totalPoints = dataPoints.reduce((a, b) => a + b, 0);
  
  // Normalize to 0-1 scale (100 points = high confidence)
  return Math.min(1, totalPoints / 100);
} 