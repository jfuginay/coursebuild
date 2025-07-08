import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const QUIZ_GENERATION_PROMPT = `
You are an expert educational content creator. Analyze this YouTube video and generate engaging quiz questions based on its content.

Guidelines:
1. Watch the entire video and understand the key concepts presented
2. Create questions that test understanding of the main ideas and important details
3. Include accurate timestamps where each question should appear (in seconds from video start)
4. Mix question types: multiple choice, true/false, and visual hotspot questions
5. Ensure questions are directly related to content at the specified timestamp
6. Make questions educational and engaging, not trivial
7. Provide clear explanations for answers
8. Pay attention to visual elements like diagrams, charts, demonstrations, or on-screen text

Requirements:
- Generate {maxQuestions} questions maximum
- Difficulty level: {difficulty}
- Questions should be spaced throughout the video duration
- Each question should have an accurate timestamp within the video
- For visual hotspot questions, describe specific visual elements shown at that timestamp
- Include a variety of question types to test different aspects of understanding

{focusTopics}

Return your response in the following JSON format:
{
  "video_summary": "Brief summary of the video content and main topics covered",
  "total_duration": "Duration in seconds",
  "questions": [
    {
      "timestamp": 120,
      "question": "What is the main concept being explained at this point in the video?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "The correct answer is A because at 2:00 the speaker explains...",
      "visual_context": "Description of what's shown on screen at this timestamp"
    },
    {
      "timestamp": 240,
      "question": "The speaker states that this process is irreversible.",
      "type": "true_false",
      "correct_answer": false,
      "explanation": "This is false because at 4:00 the speaker clarifies that...",
      "visual_context": "Description of any diagrams or visuals shown"
    },
    {
      "timestamp": 360,
      "question": "Identify the component highlighted in the diagram shown at this timestamp.",
      "type": "hotspot",
      "visual_context": "At 6:00, there's a circuit diagram with a red highlighted component",
      "correct_answer": "resistor",
      "explanation": "The highlighted component is a resistor because..."
    }
  ]
}
`;

function mapGeminiTypeToDbType(geminiType: string): string {
  switch(geminiType) {
    case 'mcq':
      return 'multiple-choice';
    case 'true_false':
      return 'true-false';
    case 'hotspot':
      return 'short-answer';
    default:
      return 'multiple-choice';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    // Parse request
    const {
      course_id,
      youtube_url,
      max_questions = 10,
      difficulty_level = 'medium',
      focus_topics = []
    } = await req.json();

    if (!course_id) {
      throw new Error('Course ID is required');
    }

    if (!youtube_url) {
      throw new Error('YouTube URL is required');
    }

    console.log('🎬 Starting question generation for course:', course_id);
    console.log('🎬 YouTube URL:', youtube_url);

    // Verify course exists
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, title')
      .eq('id', course_id)
      .single();

    if (courseError) {
      console.error('❌ Course not found:', courseError);
      throw new Error(`Course not found: ${courseError.message}`);
    }

    console.log('✅ Course found:', course.title);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build focus topics section
    const focusTopicsSection = focus_topics.length > 0 
      ? `Focus on these specific topics: ${focus_topics.join(', ')}`
      : 'Cover the main topics presented in the video';

    const prompt = QUIZ_GENERATION_PROMPT
      .replace('{maxQuestions}', max_questions.toString())
      .replace('{difficulty}', difficulty_level)
      .replace('{focusTopics}', focusTopicsSection);

    const finalPrompt = `${prompt}\n\nWatch the entire video and generate quiz questions based on its content.\n\nIMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and quoted.`;

    // Generate content using Gemini
    const content = [
      { text: finalPrompt },
      {
        fileData: {
          fileUri: youtube_url,
          mimeType: "video/*"
        }
      }
    ];

    console.log('✅ Content sent to gemini', content);
    console.log('🤖 Calling Gemini API...');

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Received response from Gemini:', text.substring(0, 200) + '...');

    // Extract and parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    let parsedResponse;
    try {
      // Clean up the JSON
      let cleanJson = jsonMatch[0].trim();
      cleanJson = cleanJson
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      
      parsedResponse = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      throw new Error(`Failed to parse Gemini response: ${parseError}`);
    }

    // Create questions in database
    const questionsToInsert = parsedResponse.questions.map((q: any) => ({
      course_id: course_id,
      timestamp: q.timestamp,
      question: q.question,
      type: mapGeminiTypeToDbType(q.type),
      options: q.options ? JSON.stringify(q.options) : null,
      correct_answer: String(q.correct_answer),
      explanation: q.explanation,
      visual_context: q.visual_context,
      accepted: false
    }));

    const { data: questions, error: questionsError } = await supabaseClient
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (questionsError) {
      console.error('❌ Questions creation error:', questionsError);
      throw new Error(`Failed to create questions: ${questionsError.message}`);
    }

    console.log('✅ Questions created:', questions.length);

    // Return response
    return new Response(
      JSON.stringify({
        course_id: course_id,
        questions: questions.map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-questions function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
