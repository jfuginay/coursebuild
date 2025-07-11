/**
 * InfoBite Agent - Inject Insight Edge Function
 * 
 * Generates contextual micro-lessons based on learner behavior and autonomy settings.
 * Uses transcript context and wrong answer patterns to provide timely hints.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  type: 'MICRO_LESSON' | 'noop';
  text?: string;
  timestamp?: number;
  metadata?: {
    source?: string;
    confidence?: number;
    conceptsRelated?: string[];
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
  
  // If user is struggling (high wrong answer streak), provide more direct help
  if (wrongAnswerStreak >= 2) {
    // Look for key concepts being explained
    if (concepts.length > 0) {
      const concept = concepts[0];
      return {
        text: `💡 Focus on understanding "${concept.concept}" - it's key to answering the questions.`,
        metadata: {
          source: 'concept_focus',
          confidence: 0.9,
          conceptsRelated: [concept.concept]
        }
      };
    }

    // Provide encouragement with context
    return {
      text: `📝 Pro tip: ${currentSegment.text.slice(0, 100)}... Pay attention to this part!`,
      metadata: {
        source: 'transcript_highlight',
        confidence: 0.8
      }
    };
  }

  // Normal hints - provide subtle guidance
  const hintTemplates = [
    {
      condition: () => concepts.length > 0,
      generate: () => `🎯 New concept introduced: "${concepts[0].concept}". Watch how it's applied.`,
      metadata: { source: 'concept_intro', confidence: 0.85 }
    },
    {
      condition: () => currentSegment.is_salient_event === 'true',
      generate: () => `⚡ Important moment! This section often appears in questions.`,
      metadata: { source: 'salient_event', confidence: 0.9 }
    },
    {
      condition: () => currentSegment.visual_description,
      generate: () => `👀 Notice what's shown on screen - visual elements may be important.`,
      metadata: { source: 'visual_cue', confidence: 0.7 }
    },
    {
      condition: () => segments.length > 3,
      generate: () => `🔄 This section connects to what was discussed earlier. Think about the relationship.`,
      metadata: { source: 'connection_hint', confidence: 0.75 }
    }
  ];

  // Find applicable hint
  for (const template of hintTemplates) {
    if (template.condition()) {
      return {
        text: template.generate(),
        metadata: {
          ...template.metadata,
          conceptsRelated: concepts.map(c => c.concept)
        }
      };
    }
  }

  // Default contextual hint
  const words = currentSegment.text.split(' ');
  const keyPhrase = words.slice(0, Math.min(words.length, 15)).join(' ');
  
  return {
    text: `💭 Key point: "${keyPhrase}..."`,
    metadata: {
      source: 'key_phrase',
      confidence: 0.6,
      conceptsRelated: concepts.map(c => c.concept)
    }
  };
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

    // Return hint
    const response: InsightResponse = {
      type: 'MICRO_LESSON',
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