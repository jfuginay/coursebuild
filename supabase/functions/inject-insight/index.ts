/**
 * InfoBite Agent - Inject Insight Edge Function
 * 
 * Generates contextual micro-lessons based on learner behavior and autonomy settings.
 * Uses transcript context and AI to provide valuable, dynamic insights.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-autonomy-level',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Types
interface InsightRequest {
  userId: string;
  courseId: string;
  currentTime: number; // Video timestamp in seconds
  autonomyLevel: number; // 0 = off, 1 = help, 2 = guide
  wrongAnswerStreak: number;
}

interface InsightResponse {
  type: 'MICRO_LESSON' | 'ANALOGY' | 'APPLICATION' | 'CLARIFICATION' | 'DEEPER_DIVE' | 'noop';
  text?: string;
  timestamp?: number;
  metadata?: {
    source?: string;
    confidence?: number;
    conceptsRelated?: string[];
    insightType?: string;
    emphasis?: string;
  };
}

// Cooldown settings by autonomy level (in seconds)
const COOLDOWN_SETTINGS = {
  0: Infinity, // Manual mode - no hints
  1: 90,       // Help mode - 90 seconds
  2: 45,       // Guide mode - 45 seconds
};

// Wrong answer threshold for immediate hint (Guide mode only)
const WRONG_ANSWER_THRESHOLD = 2;

/**
 * Extract relevant transcript context around current timestamp
 */
async function getTranscriptContext(
  supabase: any,
  courseId: string,
  timestamp: number,
  windowSeconds: number = 60
) {
  const startTime = Math.max(0, timestamp - windowSeconds);
  const endTime = timestamp + windowSeconds;

  const { data: segments, error } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('course_id', courseId)
    .gte('timestamp', startTime)
    .lte('timestamp', endTime)
    .order('timestamp', { ascending: true });

  if (error || !segments || segments.length === 0) {
    console.error('Failed to fetch transcript segments:', error);
    return null;
  }

  // Find key concepts mentioned in this window
  const { data: concepts } = await supabase
    .from('transcript_key_concepts')
    .select('concept, first_mentioned')
    .eq('course_id', courseId)
    .gte('first_mentioned', startTime)
    .lte('first_mentioned', endTime);

  return {
    segments,
    concepts: concepts || [],
    currentSegment: segments.find(s => s.timestamp <= timestamp && (!s.end_timestamp || s.end_timestamp > timestamp))
  };
}

/**
 * Detect the type of content being discussed
 */
function detectContentType(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('example') || lowerText.includes('for instance')) return 'example';
  if (lowerText.includes('define') || lowerText.includes('what is')) return 'definition';
  if (lowerText.includes('formula') || lowerText.includes('equation')) return 'formula';
  if (lowerText.includes('process') || lowerText.includes('steps')) return 'process';
  if (lowerText.includes('code') || lowerText.includes('function')) return 'code';
  return 'explanation';
}

/**
 * Generate AI-powered insight using Google's Gemini
 */
async function generateAIInsight(
  currentText: string,
  surroundingContext: string,
  concepts: any[],
  wrongAnswerStreak: number
): Promise<{ text: string; type: string; emphasis: string }> {
  const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_AI_API_KEY') || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const contentType = detectContentType(currentText);
  
  // Build dynamic prompt based on content type and user struggle level
  let promptInstruction = `Analyze this educational content and provide a valuable insight that adds NEW information not mentioned in the transcript.\n\n`;
  
  if (wrongAnswerStreak >= 2) {
    promptInstruction += `The learner is struggling (${wrongAnswerStreak} wrong answers). Provide a very clear, helpful insight that clarifies the concept.\n`;
  }
  
  const contentTypePrompts = {
    'definition': 'Provide a memorable analogy or real-world comparison that makes this concept easier to understand.',
    'formula': 'Explain a practical application or show why this formula matters in real life.',
    'process': 'Give a simpler analogy or break down why each step is important.',
    'code': 'Highlight a common pitfall to avoid or a best practice related to this.',
    'example': 'Add context about why this example is significant or what principle it demonstrates.',
    'explanation': 'Provide an interesting fact, application, or deeper insight about this concept.'
  };
  
  promptInstruction += contentTypePrompts[contentType] || contentTypePrompts['explanation'];
  
  const prompt = `
${promptInstruction}

Current content being discussed:
"${currentText}"

Surrounding context:
"${surroundingContext}"

${concepts.length > 0 ? `Key concepts: ${concepts.map(c => c.concept).join(', ')}` : ''}

Generate a 2-3 sentence insight that:
1. Adds value beyond what's being said
2. Is engaging and memorable
3. Helps the learner understand better

Format: Start with an emoji that fits the insight type, then provide the insight.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Determine insight type from the generated content
    let insightType = 'DEEPER_DIVE';
    if (text.includes('like') || text.includes('similar to')) insightType = 'ANALOGY';
    else if (text.includes('real-world') || text.includes('used in')) insightType = 'APPLICATION';
    else if (text.includes('common mistake') || text.includes('clarify')) insightType = 'CLARIFICATION';
    
    // Extract key emphasis (first few words after emoji)
    const emphasisMatch = text.match(/^[^\s]+ (.{10,30})/);;
    const emphasis = emphasisMatch ? emphasisMatch[1] + '...' : 'Key insight';
    
    return {
      text: text.trim(),
      type: insightType,
      emphasis
    };
  } catch (error) {
    console.error('AI generation failed:', error);
    // Fallback to template-based generation
    return generateTemplateHint(currentText, concepts, wrongAnswerStreak);
  }
}

/**
 * Fallback template-based hint generation
 */
function generateTemplateHint(
  currentText: string,
  concepts: any[],
  wrongAnswerStreak: number
): { text: string; type: string; emphasis: string } {
  if (wrongAnswerStreak >= 2 && concepts.length > 0) {
    return {
      text: `💡 Focus on understanding "${concepts[0].concept}" - it's key to answering the questions.`,
      type: 'CLARIFICATION',
      emphasis: 'Focus on key concept'
    };
  }
  
  return {
    text: `🎯 Pay attention to this section - it often appears in questions.`,
    type: 'DEEPER_DIVE',
    emphasis: 'Important section'
  };
}

/**
 * Generate a micro-lesson hint based on context
 */
async function generateHint(
  context: any,
  wrongAnswerStreak: number
): Promise<{ text: string; metadata: any }> {
  if (!context || !context.currentSegment) {
    return {
      text: "Keep watching carefully - important concepts are being explained.",
      metadata: { source: 'fallback', confidence: 0.5 }
    };
  }

  const { segments, concepts, currentSegment } = context;
  
  // Prepare surrounding context (combine nearby segments)
  const surroundingContext = segments
    .map(s => s.text)
    .join(' ')
    .slice(0, 500); // Limit context size
  
  try {
    // Generate AI-powered insight
    const aiInsight = await generateAIInsight(
      currentSegment.text,
      surroundingContext,
      concepts,
      wrongAnswerStreak
    );
    
    return {
      text: aiInsight.text,
      metadata: {
        source: 'ai_generated',
        confidence: 0.9,
        conceptsRelated: concepts.map(c => c.concept),
        insightType: aiInsight.type,
        emphasis: aiInsight.emphasis
      }
    };
  } catch (error) {
    console.error('Failed to generate AI insight:', error);
    
    // Fallback to template hint
    const fallbackHint = generateTemplateHint(
      currentSegment.text,
      concepts,
      wrongAnswerStreak
    );
    
    return {
      text: fallbackHint.text,
      metadata: {
        source: 'template_fallback',
        confidence: 0.7,
        conceptsRelated: concepts.map(c => c.concept),
        insightType: fallbackHint.type,
        emphasis: fallbackHint.emphasis
      }
    };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request
    const { userId, courseId, currentTime, autonomyLevel, wrongAnswerStreak } = await req.json() as InsightRequest;

    // Extract autonomy level from header if provided
    const headerAutonomy = req.headers.get('x-autonomy-level');
    const effectiveAutonomy = headerAutonomy ? parseInt(headerAutonomy) : autonomyLevel;

    console.log(`🎯 InfoBite request: user=${userId}, course=${courseId}, time=${currentTime}, autonomy=${effectiveAutonomy}, streak=${wrongAnswerStreak}`);

    // Check autonomy level 0 (Manual mode) - never send hints
    if (effectiveAutonomy === 0) {
      return new Response(
        JSON.stringify({ type: 'noop' } as InsightResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log learner event (WATCH)
    await supabaseClient
      .from('learner_events')
      .insert({
        user_id: userId,
        course_id: courseId,
        event_type: 'WATCH',
        video_timestamp: currentTime,
        metadata: { autonomy_level: effectiveAutonomy }
      });

    // Check cooldown
    const cooldownSeconds = COOLDOWN_SETTINGS[effectiveAutonomy as keyof typeof COOLDOWN_SETTINGS] || 90;
    const { data: canShowHint } = await supabaseClient
      .rpc('check_hint_cooldown', {
        p_user_id: userId,
        p_course_id: courseId,
        p_cooldown_seconds: cooldownSeconds
      });

    // For Guide mode (2), bypass cooldown if wrong answer streak is high
    const shouldBypassCooldown = effectiveAutonomy === 2 && wrongAnswerStreak >= WRONG_ANSWER_THRESHOLD;

    if (!canShowHint && !shouldBypassCooldown) {
      console.log(`⏱️ Cooldown active, no hint shown`);
      return new Response(
        JSON.stringify({ type: 'noop' } as InsightResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get wrong answer streak from database
    const { data: dbStreak } = await supabaseClient
      .rpc('get_wrong_answer_streak', {
        p_user_id: userId,
        p_course_id: courseId,
        p_time_window: '10 minutes'
      });

    const effectiveStreak = Math.max(wrongAnswerStreak, dbStreak || 0);

    // Decide whether to show hint based on conditions
    const shouldShowHint = 
      effectiveStreak >= WRONG_ANSWER_THRESHOLD || // High wrong answer streak
      (effectiveAutonomy === 2 && Math.random() < 0.3) || // Guide mode: 30% chance
      (effectiveAutonomy === 1 && Math.random() < 0.15); // Help mode: 15% chance

    if (!shouldShowHint && !shouldBypassCooldown) {
      return new Response(
        JSON.stringify({ type: 'noop' } as InsightResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transcript context
    const context = await getTranscriptContext(supabaseClient, courseId, currentTime);

    // Generate hint
    const hint = await generateHint(context, effectiveStreak);

    // Update cooldown
    await supabaseClient.rpc('update_hint_cooldown', {
      p_user_id: userId,
      p_course_id: courseId
    });

    // Log hint shown event
    await supabaseClient
      .from('learner_events')
      .insert({
        user_id: userId,
        course_id: courseId,
        event_type: 'HINT_SHOWN',
        video_timestamp: currentTime,
        metadata: {
          hint_text: hint.text,
          wrong_answer_streak: effectiveStreak,
          autonomy_level: effectiveAutonomy,
          ...hint.metadata
        }
      });

    console.log(`💡 Hint generated: ${hint.text.substring(0, 50)}...`);

    // Return enhanced hint
    const response: InsightResponse = {
      type: hint.metadata.insightType || 'MICRO_LESSON',
      text: hint.text,
      timestamp: currentTime,
      metadata: hint.metadata
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in inject-insight:', error);
    
    return new Response(
      JSON.stringify({ 
        type: 'noop',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});