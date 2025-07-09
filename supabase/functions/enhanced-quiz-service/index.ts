import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const ENHANCED_QUIZ_GENERATION_PROMPT = `
You are an expert educational content creator. Analyze this YouTube video and generate engaging quiz questions with enhanced visual capabilities.

Guidelines:
1. Watch the entire video and understand the key concepts presented
2. Create questions that leverage visual elements when appropriate
3. Include accurate timestamps where each question should appear (in seconds from video start)
4. Mix question types: multiple choice, true/false, visual hotspot, matching, and sequencing
5. For visual questions, identify specific timestamps with rich visual content
6. Make questions educational and engaging, not trivial
7. Provide clear explanations for answers
8. Pay attention to visual elements like diagrams, charts, demonstrations, or on-screen text

Enhanced Visual Question Types:
- HOTSPOT: Questions about specific visual elements (requires bounding box annotations)
- MATCHING: Match visual elements with concepts or terms
- SEQUENCING: Order visual steps or processes shown in the video
- ANNOTATION: Identify and label parts of diagrams or visual content

Requirements:
- Generate {maxQuestions} questions maximum
- Difficulty level: {difficulty}
- Questions should be spaced throughout the video duration
- Each question should have an accurate timestamp within the video
- For visual questions, describe specific visual elements and their educational value
- Include a variety of question types with emphasis on visual learning

{focusTopics}

Return your response in the following JSON format:
{
  "video_summary": "Brief summary of the video content and main topics covered",
  "total_duration": "Duration in seconds",
  "visual_moments": [
    {
      "timestamp": 120,
      "description": "Circuit diagram showing component relationships",
      "visual_complexity": "high",
      "educational_value": "excellent for hotspot questions"
    }
  ],
  "questions": [
    {
      "timestamp": 120,
      "question": "What is the main concept being explained at this point in the video?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "The correct answer is A because at 2:00 the speaker explains...",
      "visual_context": "Description of what's shown on screen at this timestamp",
      "visual_question_type": null,
      "requires_frame_capture": false
    },
    {
      "timestamp": 240,
      "question": "Identify the resistor component in the circuit diagram.",
      "type": "hotspot",
      "visual_context": "Circuit diagram with multiple electronic components labeled",
      "visual_question_type": "hotspot",
      "requires_frame_capture": true,
      "correct_answer": "resistor",
      "explanation": "The resistor is the zigzag component shown in the diagram...",
      "hotspot_elements": [
        {
          "label": "resistor",
          "description": "The main component to identify",
          "is_correct": true
        },
        {
          "label": "capacitor", 
          "description": "Distractor component",
          "is_correct": false
        }
      ]
    },
    {
      "timestamp": 360,
      "question": "Match the following terms with their visual representations shown in the video.",
      "type": "matching",
      "visual_context": "Multiple diagrams showing different electrical components",
      "visual_question_type": "matching",
      "requires_frame_capture": true,
      "matching_pairs": [
        {
          "left": "Resistor Symbol",
          "right": "Zigzag line component",
          "frame_timestamp": 360
        },
        {
          "left": "Capacitor Symbol", 
          "right": "Parallel lines component",
          "frame_timestamp": 370
        }
      ],
      "explanation": "Each electrical component has a standard symbol used in circuit diagrams..."
    }
  ]
}
`;

interface EnhancedQuizRequest {
  course_id: string;
  youtube_url: string;
  max_questions?: number;
  difficulty_level?: string;
  focus_topics?: string[];
  enable_visual_questions?: boolean;
}

// Enhanced question generation with visual integration
async function generateEnhancedQuestions(
  supabaseClient: any,
  genAI: GoogleGenerativeAI,
  courseId: string,
  youtubeUrl: string,
  maxQuestions: number = 10,
  difficultyLevel: string = 'medium',
  focusTopics: string[] = [],
  enableVisualQuestions: boolean = true
): Promise<any> {
  console.log('🎬 Starting enhanced question generation...');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  // Build focus topics section
  const focusTopicsSection = focusTopics.length > 0 
    ? `Focus on these specific topics: ${focusTopics.join(', ')}`
    : 'Cover the main topics presented in the video';

  const prompt = ENHANCED_QUIZ_GENERATION_PROMPT
    .replace('{maxQuestions}', maxQuestions.toString())
    .replace('{difficulty}', difficultyLevel)
    .replace('{focusTopics}', focusTopicsSection);

  const finalPrompt = `${prompt}\n\nWatch the entire video and generate enhanced quiz questions with visual capabilities.\n\nIMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and quoted.`;

  // Generate content using Gemini
  const content = [
    { text: finalPrompt },
    {
      fileData: {
        fileUri: youtubeUrl,
        mimeType: "video/*"
      }
    }
  ];

  console.log('🤖 Calling Gemini API for enhanced analysis...');
  const result = await model.generateContent(content);
  const response = await result.response;
  const text = response.text();

  // Extract and parse JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Gemini response');
  }

  let parsedResponse;
  try {
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

  return parsedResponse;
}

// Process visual questions and create frame captures
async function processVisualQuestions(
  supabaseClient: any,
  courseId: string,
  youtubeUrl: string,
  questions: any[]
): Promise<any[]> {
  const visualQuestions = questions.filter(q => q.requires_frame_capture);
  
  if (visualQuestions.length === 0) {
    console.log('📝 No visual questions found, skipping frame processing');
    return questions;
  }

  console.log(`🎥 Processing ${visualQuestions.length} visual questions with targeted analysis...`);

  // Call visual frame service with the generated questions
  try {
    const frameServiceUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/visual-frame-service`;
    
    const frameResponse = await fetch(frameServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      },
      body: JSON.stringify({
        course_id: courseId,
        youtube_url: youtubeUrl,
        action: 'process-visual-questions',
        questions: visualQuestions // Pass questions with timestamps and visual_context
      })
    });

    if (frameResponse.ok) {
      const frameData = await frameResponse.json();
      console.log(`✅ Visual frame processing completed:`);
      console.log(`   - ${frameData.processed_questions} questions processed`);
      console.log(`   - ${frameData.successful_captures} frames captured successfully`);
      console.log(`   - ${frameData.summary?.total_bounding_boxes || 0} bounding boxes detected`);
      console.log(`   - ${frameData.enhanced_questions?.length || 0} enhanced questions generated`);
      
      // Update questions with visual asset information
      const updatedQuestions = questions.map(question => {
        if (!question.requires_frame_capture) return question;
        
        const visualResult = frameData.results?.find((r: any) => 
          r.timestamp === question.timestamp && r.success
        );
        
        if (visualResult) {
          return {
            ...question,
            visual_asset_id: visualResult.visual_asset_id,
            frame_url: visualResult.frame_url,
            bounding_boxes: visualResult.bounding_boxes,
            detected_objects: visualResult.detected_objects
          };
        }
        
        return question;
      });
      
      return updatedQuestions;
      
    } else {
      const errorText = await frameResponse.text();
      console.warn('⚠️ Visual frame processing failed:', errorText);
      console.warn('   Continuing with text-only questions');
      return questions;
    }
  } catch (error) {
    console.warn('⚠️ Visual frame service unavailable, continuing without frame capture:', error);
    return questions;
  }
}

// Map Gemini question types to database types
function mapGeminiTypeToDbType(geminiType: string): string {
  switch(geminiType) {
    case 'mcq':
      return 'multiple-choice';
    case 'true_false':
      return 'true-false';
    case 'hotspot':
      return 'hotspot';
    case 'matching':
      return 'matching';
    case 'sequencing':
      return 'sequencing';
    default:
      return 'multiple-choice';
  }
}

// Store enhanced questions with visual data
async function storeEnhancedQuestions(
  supabaseClient: any,
  courseId: string,
  questions: any[]
): Promise<any[]> {
  console.log('💾 Storing enhanced questions...');

  const questionsToInsert = questions.map((q: any) => {
    // Ensure true/false questions have proper options
    let options = q.options;
    let correctAnswer = q.correct_answer;
    
    if (q.type === 'true_false') {
      options = options || ["True", "False"];
      // Convert boolean to array index
      if (typeof correctAnswer === 'boolean') {
        correctAnswer = correctAnswer ? 1 : 0;
      }
    }
    
    return {
      course_id: courseId,
      timestamp: q.timestamp,
      question: q.question,
      type: mapGeminiTypeToDbType(q.type),
      options: options ? JSON.stringify(options) : null,
      correct_answer: String(correctAnswer),
      explanation: q.explanation,
      visual_context: q.visual_context,
      has_visual_asset: q.requires_frame_capture || false,
      visual_question_type: q.visual_question_type || null,
      fallback_prompt: q.type === 'hotspot' ? `Generate simple diagram for: ${q.question}` : null,
      accepted: false
    };
  });

  const { data: createdQuestions, error: questionsError } = await supabaseClient
    .from('questions')
    .insert(questionsToInsert)
    .select();

  if (questionsError) {
    throw new Error(`Failed to create questions: ${questionsError.message}`);
  }

  // Process visual questions for bounding boxes and matching pairs
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const dbQuestion = createdQuestions[i];

    // Store hotspot elements as bounding boxes (placeholder data)
    if (question.type === 'hotspot' && question.hotspot_elements) {
      const boundingBoxes = question.hotspot_elements.map((element: any, index: number) => ({
        question_id: dbQuestion.id,
        visual_asset_id: null, // Will be populated when frame is captured
        label: element.label,
        x: 0.3 + (index * 0.1), // Mock coordinates
        y: 0.3 + (index * 0.1),
        width: 0.15,
        height: 0.1,
        confidence_score: 0.9,
        is_correct_answer: element.is_correct
      }));

      const { error: bboxError } = await supabaseClient
        .from('bounding_boxes')
        .insert(boundingBoxes);

      if (bboxError) {
        console.warn(`Failed to store bounding boxes for question ${dbQuestion.id}:`, bboxError);
      }
    }
  }

  console.log(`✅ Stored ${createdQuestions.length} enhanced questions`);
  return createdQuestions;
}

// Update stored questions with visual asset IDs after frame processing
async function updateQuestionsWithVisualAssets(
  supabaseClient: any,
  storedQuestions: any[],
  processedQuestions: any[]
): Promise<any[]> {
  console.log('🔗 Updating questions with visual asset links...');
  
  for (let i = 0; i < storedQuestions.length; i++) {
    const storedQuestion = storedQuestions[i];
    const processedQuestion = processedQuestions[i];
    
    // If the processed question has a visual_asset_id, update the database
    if (processedQuestion.visual_asset_id) {
      console.log(`🔗 Linking question ${storedQuestion.id} to visual asset ${processedQuestion.visual_asset_id}`);
      
      const { error: updateError } = await supabaseClient
        .from('questions')
        .update({ 
          visual_asset_id: processedQuestion.visual_asset_id
        })
        .eq('id', storedQuestion.id);
      
      if (updateError) {
        console.warn(`⚠️ Failed to update question ${storedQuestion.id} with visual asset:`, updateError);
      } else {
        storedQuestion.visual_asset_id = processedQuestion.visual_asset_id;
      }
    }
  }
  
  const linkedCount = storedQuestions.filter(q => q.visual_asset_id).length;
  console.log(`✅ Updated ${linkedCount} questions with visual asset links`);
  
  return storedQuestions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const {
      course_id,
      youtube_url,
      max_questions = 10,
      difficulty_level = 'medium',
      focus_topics = [],
      enable_visual_questions = true
    }: EnhancedQuizRequest = await req.json();

    if (!course_id || !youtube_url) {
      throw new Error('Course ID and YouTube URL are required');
    }

    console.log('🎬 Starting enhanced quiz generation for course:', course_id);

    // Verify course exists
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, title')
      .eq('id', course_id)
      .single();

    if (courseError) {
      throw new Error(`Course not found: ${courseError.message}`);
    }

    console.log('✅ Course found:', course.title);

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Step 1: Generate enhanced questions with visual capabilities
    const analysisResult = await generateEnhancedQuestions(
      supabaseClient,
      genAI,
      course_id,
      youtube_url,
      max_questions,
      difficulty_level,
      focus_topics,
      enable_visual_questions
    );

    // Step 2: Process visual questions for frame capture
    const processedQuestions = await processVisualQuestions(
      supabaseClient,
      course_id,
      youtube_url,
      analysisResult.questions
    );

    // Step 3: Store enhanced questions in database
    const storedQuestions = await storeEnhancedQuestions(
      supabaseClient,
      course_id,
      processedQuestions
    );

    // Step 4: Update questions with visual asset links
    const linkedQuestions = await updateQuestionsWithVisualAssets(
      supabaseClient,
      storedQuestions,
      processedQuestions
    );

    // Return enhanced response
    return new Response(
      JSON.stringify({
        success: true,
        course_id: course_id,
        video_summary: analysisResult.video_summary,
        total_duration: analysisResult.total_duration,
        visual_moments: analysisResult.visual_moments || [],
        questions: linkedQuestions.map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        })),
        enhanced_features: {
          visual_questions_enabled: enable_visual_questions,
          visual_questions_count: processedQuestions.filter(q => q.requires_frame_capture).length,
          frame_capture_available: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in enhanced-quiz-service:', error);
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