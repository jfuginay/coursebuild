import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const QUIZ_GENERATION_PROMPT = `
You are an expert educational content creator and instructional designer. Your task is to create high-quality quiz questions that test deep understanding, not just recall. Follow these advanced educational design principles:

## LEARNING TAXONOMY FRAMEWORK
Target different levels of Bloom's taxonomy:
1. **REMEMBER** (Basic): Facts, definitions, procedures
2. **UNDERSTAND** (Conceptual): Explanation, interpretation, comparison
3. **APPLY** (Procedural): Using concepts in new situations
4. **ANALYZE** (Analytical): Breaking down, relationships, patterns
5. **EVALUATE** (Critical): Judgments, critiques, assessments
6. **CREATE** (Creative): Synthesis, design, innovation

## QUESTION TYPE SELECTION CRITERIA

### MULTIPLE CHOICE (mcq)
- **Best for**: Concept understanding, problem-solving steps, comparing alternatives
- **Avoid**: Simple recall or "what did the speaker say" questions
- **Timestamp Strategy**: Place during or immediately after key concept explanations
- **Quality Check**: Distractors should be plausible misconceptions, not obviously wrong

### TRUE/FALSE (true_false)
- **Best for**: Common misconceptions, principle validation, cause-effect relationships
- **Avoid**: Trivial facts or easily guessed statements
- **Timestamp Strategy**: After complex explanations where misconceptions are likely
- **Quality Check**: Statement should require understanding, not just recall

### HOTSPOT (hotspot)
- **Best for**: Visual identification, component recognition, spatial relationships
- **CRITICAL**: Frame questions as "Click on the [specific object]" where multiple similar objects are visible
- **Optimal Timestamps**: 
  - During close-up views with MULTIPLE objects/components visible
  - When diagrams/charts show several distinct elements
  - During demonstrations with 3+ clear visual elements on screen
  - Avoid: Fast-moving scenes, transitions, unclear visuals, or single-object frames
- **Quality Check**: Must have 3+ visible objects for meaningful choice; target object should be educationally significant
- **Question Framing**: "Click on the resistor in this circuit" (when circuit shows multiple components)

### MATCHING (matching)
- **Best for**: Connecting concepts, cause-effect pairs, category relationships
- **Avoid**: Arbitrary connections or simple definitional matching
- **Content Analysis**: Look for natural conceptual pairs in the content
- **Quality Check**: Pairs should test understanding of relationships, not memorization

### SEQUENCING (sequencing)
- **Best for**: Process steps, logical progression, chronological understanding
- **Avoid**: Random order of speaker statements
- **Focus on**: Logical/causal sequences, problem-solving steps, development stages
- **Quality Check**: Sequence should have educational logic, not just temporal order

## CONTENT ANALYSIS FRAMEWORK

### Phase 1: Video Structure Analysis
1. Identify main topics and subtopics
2. Map conceptual relationships and dependencies
3. Locate key moments: explanations, examples, demonstrations
4. Identify visual elements: diagrams, objects, processes

### Phase 2: Learning Objective Mapping
1. What should students UNDERSTAND after watching?
2. What can they DO with this knowledge?
3. What common MISCONCEPTIONS might arise?
4. What CONNECTIONS exist between concepts?

### Phase 3: Question Strategy
1. **Conceptual Questions** (40%): Test understanding of main ideas
2. **Application Questions** (30%): Test ability to use knowledge
3. **Analysis Questions** (20%): Test ability to break down complex ideas
4. **Visual Questions** (10%): Test visual recognition and spatial understanding

## TIMESTAMP OPTIMIZATION GUIDELINES

### For ALL Questions:
- Place questions at natural pause points or after complete explanations
- Avoid interrupting mid-sentence or during transitions
- Space questions every 60-90 seconds for optimal engagement
- Consider cognitive load - avoid clustering difficult questions

### For HOTSPOT Questions Specifically:
- **Prime Moments**: When 3+ objects are clearly visible and stationary for user selection
- **Avoid**: Motion blur, poor lighting, cluttered scenes, single-object frames
- **Ideal Scenarios**: 
  - Labeled diagrams showing multiple components/elements
  - Close-up views with several equipment/components visible
  - Clear demonstrations with 3+ distinct selectable objects
  - Paused or slow-motion sequences with multiple visible elements
- **REQUIREMENT**: Only generate hotspot questions when multiple similar objects are visible on screen

### For VISUAL Questions (Matching/Sequencing):
- Use when supporting visuals enhance comprehension
- Timestamp should capture relevant visual context
- Ensure visual elements support the learning objective

## QUALITY CONTROL CHECKLIST

Before generating each question, verify:
- ✅ Tests understanding, not just recall
- ✅ Relates to learning objectives
- ✅ Timestamp optimizes visual/auditory content
- ✅ Distractors are educationally meaningful
- ✅ Question type matches content appropriately
- ✅ Explanation deepens understanding

## SPECIFIC INSTRUCTIONS

1. **Analyze the entire video** to understand the educational flow
2. **Identify 3-5 key concepts** that students should master
3. **Map visual opportunities** for hotspot questions (look for clear diagrams, labeled components, demonstrations)
4. **Create questions that build on each other** - early questions can support later ones
5. **Prioritize depth over breadth** - better to have fewer high-quality questions

Requirements:
- Generate maximum {maxQuestions} questions
- Difficulty level: {difficulty}
- Include at least 1 hotspot question IF suitable visual content exists
- Focus on {focusTopics}
- Ensure explanations teach, don't just confirm answers

Return response in this JSON format:
{
  "video_summary": "Educational summary focusing on key learning objectives and concepts",
  "total_duration": "Duration in seconds",
  "learning_objectives": ["List of 3-5 key things students should understand"],
  "content_analysis": {
    "main_topics": ["Topic 1", "Topic 2"],
    "key_visual_moments": [
      {
        "timestamp": 120,
        "description": "Circuit diagram clearly showing components",
        "educational_value": "Component identification and relationships"
      }
    ],
    "common_misconceptions": ["Misconception 1", "Misconception 2"]
  },
  "questions": [
    {
      "timestamp": 120,
      "frame_timestamp": 118,
      "question": "Why does increasing resistance in this circuit decrease current flow?",
      "type": "mcq",
      "bloom_level": "understand",
      "options": ["According to Ohm's law...", "Because resistance blocks...", "The voltage drops...", "Current always decreases..."],
      "correct_answer": 0,
      "explanation": "This tests understanding of Ohm's law relationship. The correct answer demonstrates comprehension of the inverse relationship between resistance and current when voltage is constant.",
      "visual_context": "Circuit diagram showing resistor placement and current flow indicators",
      "educational_rationale": "Tests conceptual understanding of fundamental electrical principles"
    },
    {
      "timestamp": 240,
      "question": "Click on the resistor component in this circuit diagram",
      "type": "hotspot",
      "bloom_level": "apply",
      "visual_context": "Circuit diagram showing multiple components: resistor, capacitor, inductor, and battery",
      "correct_answer": "resistor",
      "explanation": "The resistor (shown with zigzag symbol) is the component that limits current flow according to Ohm's law.",
      "educational_rationale": "Tests ability to identify functional components among multiple similar objects"
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
      return 'hotspot';
    case 'matching':
      return 'matching';
    case 'sequencing':
      return 'sequencing';
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
      Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
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
    // Create questions in database with enhanced fields
    const questionsToInsert = parsedResponse.questions.map((q: any) => ({
      course_id: course_id,
      timestamp: q.timestamp,
      frame_timestamp: q.frame_timestamp || q.timestamp,
      question: q.question,
      type: mapGeminiTypeToDbType(q.type),
      options: q.options ? JSON.stringify(q.options) : null,
      correct_answer: typeof q.correct_answer === 'string' ? parseInt(q.correct_answer) || 0 : q.correct_answer,
      explanation: q.explanation,
      has_visual_asset: q.type === 'hotspot' || q.visual_context,
      metadata: JSON.stringify({
        bloom_level: q.bloom_level,
        educational_rationale: q.educational_rationale,
      visual_context: q.visual_context,
        learning_objectives: parsedResponse.learning_objectives || [],
        content_analysis: parsedResponse.content_analysis || {}
      }),
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
