/**
 * Insight Extractor Module
 * Uses LLM to extract learning insights from chat conversations
 * No hardcoded patterns - purely LLM-driven analysis
 */

import { EdgeFunctionContext, ChatMessage } from './types.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logOpenAICall } from '../quiz-generation-v5/utils/langsmith-logger.ts';

export interface InsightExtractionResult {
  insights: ExtractedInsight[];
  profileUpdates: UserProfileUpdate;
}

export interface ExtractedInsight {
  insight_type: 
    | 'struggling_concept'
    | 'learning_preference'
    | 'interest_expression'
    | 'goal_statement'
    | 'confusion_point'
    | 'understanding_confirmation'
    | 'engagement_pattern'
    | 'frustration_indicator'
    | 'success_moment';
  insight_content: {
    description: string;
    specific_details: string;
    context_clues: string[];
    related_concepts?: string[];
    severity?: number; // For struggles/confusion (0-1)
    confidence?: number; // For understanding (0-1)
  };
  confidence_score: number;
  extracted_concepts: string[];
  extracted_topics: string[];
  sentiment_score: number;
}

export interface UserProfileUpdate {
  learning_style_indicators: {
    visual?: number;
    sequential?: number;
    conceptual?: number;
    practical?: number;
    collaborative?: number;
    independent?: number;
  };
  topic_interest_changes: Record<string, number>;
  struggling_concepts_to_add: Array<{
    concept: string;
    severity: number;
  }>;
  mastered_concepts_to_add: Array<{
    concept: string;
    confidence: number;
  }>;
  engagement_metrics_update: {
    clarification_requested?: boolean;
    frustration_detected?: boolean;
    success_celebrated?: boolean;
  };
}

export class InsightExtractor {
  private supabaseClient;
  
  constructor() {
    this.supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async extractInsights(
    userMessage: string,
    assistantResponse: string,
    context: EdgeFunctionContext,
    sessionId: string,
    messageId: string
  ): Promise<InsightExtractionResult> {
    console.log('🔍 Extracting insights from chat interaction...');
    
    try {
      // Use LLM to analyze the conversation
      const llmAnalysis = await this.analyzeWithLLM(
        userMessage,
        assistantResponse,
        context
      );
      
      // Store insights in database
      if (llmAnalysis.insights.length > 0) {
        await this.storeInsights(
          llmAnalysis.insights,
          userMessage,
          assistantResponse,
          context,
          sessionId,
          messageId
        );
      }
      
      // Update user profile
      if (context.userId) {
        await this.updateUserProfile(context.userId, llmAnalysis.profileUpdates);
      }
      
      console.log(`✅ Extracted ${llmAnalysis.insights.length} insights`);
      return llmAnalysis;
      
    } catch (error) {
      console.error('❌ Error extracting insights:', error);
      // Return empty result on error to not disrupt chat flow
      return {
        insights: [],
        profileUpdates: {
          learning_style_indicators: {},
          topic_interest_changes: {},
          struggling_concepts_to_add: [],
          mastered_concepts_to_add: [],
          engagement_metrics_update: {}
        }
      };
    }
  }

  private async analyzeWithLLM(
    userMessage: string,
    assistantResponse: string,
    context: EdgeFunctionContext
  ): Promise<InsightExtractionResult> {
    const analysisPrompt = this.buildAnalysisPrompt(userMessage, assistantResponse, context);
    
    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an educational insight extractor. Analyze student-AI conversations to identify learning patterns, preferences, struggles, and successes. Extract actionable insights for personalized learning recommendations."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    };

    const response = await logOpenAICall(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      `Insight Extraction - AI Chat - ${context.courseContext.courseTitle || 'Unknown Course'}`
    );

    const data = await response.json();
    const analysisResult = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    return this.processLLMAnalysis(analysisResult);
  }

  private buildAnalysisPrompt(
    userMessage: string,
    assistantResponse: string,
    context: EdgeFunctionContext
  ): string {
    const courseInfo = `Course: ${context.courseContext.courseTitle || 'Unknown'}`;
    const videoProgress = `Video progress: ${Math.round((context.courseContext.playedTranscriptSegments.length / context.courseContext.totalSegments) * 100)}%`;
    
    return `Analyze this educational chat interaction for learning insights. Return a JSON object with extracted insights and profile updates.

CONTEXT:
${courseInfo}
${videoProgress}
Current video time: ${Math.floor(context.courseContext.currentVideoTime / 60)}:${Math.floor(context.courseContext.currentVideoTime % 60).toString().padStart(2, '0')}

USER MESSAGE: "${userMessage}"

ASSISTANT RESPONSE: "${assistantResponse}"

RECENT CONVERSATION HISTORY:
${context.conversationHistory.slice(-4).map(msg => 
  `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}`
).join('\n')}

Extract insights in this JSON structure:
{
  "insights": [
    {
      "insight_type": "struggling_concept|learning_preference|interest_expression|goal_statement|confusion_point|understanding_confirmation|engagement_pattern|frustration_indicator|success_moment",
      "insight_content": {
        "description": "Brief description of the insight",
        "specific_details": "Specific evidence from the conversation",
        "context_clues": ["List of contextual indicators"],
        "related_concepts": ["Concepts mentioned or implied"],
        "severity": 0.0-1.0 (for struggles/confusion),
        "confidence": 0.0-1.0 (for understanding)
      },
      "confidence_score": 0.0-1.0,
      "extracted_concepts": ["concept1", "concept2"],
      "extracted_topics": ["topic1", "topic2"],
      "sentiment_score": -1.0 to 1.0
    }
  ],
  "profile_updates": {
    "learning_style_indicators": {
      "visual": 0.0-1.0 (if user prefers visual explanations),
      "sequential": 0.0-1.0 (if user likes step-by-step),
      "conceptual": 0.0-1.0 (if user focuses on theory),
      "practical": 0.0-1.0 (if user wants applications),
      "collaborative": 0.0-1.0 (if user seeks discussion),
      "independent": 0.0-1.0 (if user self-directs)
    },
    "topic_interests": {
      "topic_name": -1.0 to 1.0 (negative for disinterest, positive for interest)
    },
    "struggling_concepts": [
      {"concept": "name", "severity": 0.0-1.0}
    ],
    "mastered_concepts": [
      {"concept": "name", "confidence": 0.0-1.0}
    ],
    "engagement_indicators": {
      "clarification_requested": true/false,
      "frustration_detected": true/false,
      "success_celebrated": true/false
    }
  }
}

Focus on:
1. Learning difficulties or confusion points
2. Learning style preferences shown in how they ask questions
3. Topics they express interest or disinterest in
4. Goals they mention for their learning
5. Emotional indicators (frustration, excitement, confusion)
6. Concepts they've mastered or are struggling with
7. Their preferred pace and depth of learning

Only extract insights with clear evidence from the conversation. Be specific and actionable.`;
  }

  private processLLMAnalysis(analysisResult: any): InsightExtractionResult {
    // Validate and transform the LLM output
    const insights: ExtractedInsight[] = (analysisResult.insights || [])
      .filter((insight: any) => insight.confidence_score >= 0.6)
      .map((insight: any) => ({
        insight_type: insight.insight_type,
        insight_content: insight.insight_content || {},
        confidence_score: insight.confidence_score || 0.7,
        extracted_concepts: insight.extracted_concepts || [],
        extracted_topics: insight.extracted_topics || [],
        sentiment_score: insight.sentiment_score || 0
      }));

    const profileUpdates: UserProfileUpdate = {
      learning_style_indicators: analysisResult.profile_updates?.learning_style_indicators || {},
      topic_interest_changes: analysisResult.profile_updates?.topic_interests || {},
      struggling_concepts_to_add: analysisResult.profile_updates?.struggling_concepts || [],
      mastered_concepts_to_add: analysisResult.profile_updates?.mastered_concepts || [],
      engagement_metrics_update: analysisResult.profile_updates?.engagement_indicators || {}
    };

    return { insights, profileUpdates };
  }

  private async storeInsights(
    insights: ExtractedInsight[],
    userMessage: string,
    assistantResponse: string,
    context: EdgeFunctionContext,
    sessionId: string,
    messageId: string
  ): Promise<void> {
    if (!context.userId) {
      console.warn('⚠️ No user ID available, skipping insight storage');
      return;
    }

    const insightsToStore = insights.map(insight => ({
      user_id: context.userId,
      course_id: context.courseContext.courseId,
      session_id: sessionId,
      message_id: messageId,
      insight_type: insight.insight_type,
      insight_content: insight.insight_content,
      confidence_score: insight.confidence_score,
      user_message: userMessage,
      assistant_response: assistantResponse,
      conversation_context: {
        video_progress: context.courseContext.playedTranscriptSegments.length / context.courseContext.totalSegments,
        current_time: context.courseContext.currentVideoTime,
        conversation_length: context.conversationHistory.length
      },
      extracted_concepts: insight.extracted_concepts,
      extracted_topics: insight.extracted_topics,
      sentiment_score: insight.sentiment_score
    }));

    const { error } = await this.supabaseClient
      .from('chat_insights')
      .insert(insightsToStore);

    if (error) {
      console.error('❌ Error storing insights:', error);
    } else {
      console.log(`✅ Stored ${insightsToStore.length} insights`);
    }
  }

  private async updateUserProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<void> {
    try {
      // Get current profile
      const { data: profile, error: fetchError } = await this.supabaseClient
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      let currentProfile: any;
      
      if (fetchError && fetchError.code === 'PGRST116') { // Not found error
        console.log('📝 No profile found, initializing from existing data...');
        
        // Initialize profile from existing user data
        const { data: initialized, error: initError } = await this.supabaseClient
          .functions.invoke('initialize-learning-profile', {
            body: { userId }
          });
        
        if (initError || !initialized?.profile) {
          console.error('❌ Error initializing profile:', initError);
          // Create minimal profile
          currentProfile = {
            user_id: userId,
            learning_style: {},
            topic_interests: {},
            struggling_concepts: [],
            mastered_concepts: [],
            engagement_metrics: {},
            preferred_difficulty: { intermediate: 0.7 },
            time_preferences: {},
            content_preferences: { video: 0.8, interactive: 0.7 }
          };
        } else {
          currentProfile = initialized.profile;
        }
      } else if (fetchError) {
        console.error('❌ Error fetching profile:', fetchError);
        return;
      } else {
        currentProfile = profile;
      }

      // Calculate update weights based on confidence and recency
      const insightWeight = this.calculateInsightWeight(currentProfile);

      // Merge updates with proper weighting
      const updatedProfile = {
        ...currentProfile,
        learning_style: this.mergeLearningStylesEnhanced(
          currentProfile.learning_style,
          updates.learning_style_indicators,
          insightWeight
        ),
        topic_interests: this.mergeTopicInterestsEnhanced(
          currentProfile.topic_interests,
          updates.topic_interest_changes,
          insightWeight
        ),
        struggling_concepts: await this.mergeStrugglingConceptsEnhanced(
          currentProfile.struggling_concepts,
          updates.struggling_concepts_to_add,
          userId
        ),
        mastered_concepts: await this.mergeMasteredConceptsEnhanced(
          currentProfile.mastered_concepts,
          updates.mastered_concepts_to_add,
          userId
        ),
        engagement_metrics: this.mergeEngagementMetricsEnhanced(
          currentProfile.engagement_metrics,
          updates.engagement_metrics_update,
          currentProfile.total_insights_processed || 0
        ),
        last_updated: new Date().toISOString(),
        total_insights_processed: (currentProfile.total_insights_processed || 0) + 1,
        profile_confidence: this.updateProfileConfidence(currentProfile)
      };

      // Upsert profile
      const { error: upsertError } = await this.supabaseClient
        .from('user_learning_profiles')
        .upsert(updatedProfile, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('❌ Error updating profile:', upsertError);
      } else {
        console.log('✅ Updated user learning profile with enhanced logic');
      }
    } catch (error) {
      console.error('❌ Error in profile update:', error);
    }
  }

  private calculateInsightWeight(profile: any): number {
    // Calculate weight based on profile maturity
    const totalInsights = profile.total_insights_processed || 0;
    const daysSinceUpdate = profile.last_updated 
      ? (Date.now() - new Date(profile.last_updated).getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    
    // More weight for newer insights when profile is mature
    if (totalInsights > 50) {
      return 0.15; // Smaller updates for established profiles
    } else if (totalInsights > 20) {
      return 0.25; // Medium updates
    } else {
      return 0.35; // Larger updates for new profiles
    }
  }

  private updateProfileConfidence(profile: any): number {
    const factors = [
      (profile.total_insights_processed || 0) / 100, // Insights factor
      Object.keys(profile.topic_interests || {}).length / 20, // Topic diversity
      (profile.struggling_concepts || []).length / 10, // Identified struggles
      (profile.mastered_concepts || []).length / 10, // Identified masteries
      profile.profile_confidence || 0.5 // Current confidence
    ];
    
    // Weighted average
    const weights = [0.3, 0.2, 0.2, 0.2, 0.1];
    const confidence = factors.reduce((sum, factor, i) => 
      sum + Math.min(1, factor) * weights[i], 0
    );
    
    return Math.min(0.95, confidence); // Cap at 95%
  }

  private mergeLearningStyles(current: any, updates: any): any {
    const merged = { ...current };
    for (const [style, score] of Object.entries(updates)) {
      if (typeof score === 'number' && score > 0) {
        // Weighted average with decay
        merged[style] = ((merged[style] || 0) * 0.8 + score * 0.2);
      }
    }
    return merged;
  }

  private mergeLearningStylesEnhanced(current: any, updates: any, weight: number): any {
    const merged = { ...current };
    for (const [style, score] of Object.entries(updates)) {
      if (typeof score === 'number' && score > 0) {
        // Dynamic weighting based on profile maturity
        const currentWeight = 1 - weight;
        merged[style] = ((merged[style] || 0) * currentWeight + score * weight);
      }
    }
    return merged;
  }

  private mergeTopicInterests(current: any, updates: any): any {
    const merged = { ...current };
    for (const [topic, change] of Object.entries(updates)) {
      if (typeof change === 'number') {
        merged[topic] = Math.max(-1, Math.min(1, (merged[topic] || 0) + change * 0.3));
      }
    }
    return merged;
  }

  private mergeTopicInterestsEnhanced(current: any, updates: any, weight: number): any {
    const merged = { ...current };
    
    // Decay old interests
    for (const topic in merged) {
      merged[topic] *= 0.95; // 5% decay
    }
    
    // Apply updates with dynamic weight
    for (const [topic, change] of Object.entries(updates)) {
      if (typeof change === 'number') {
        merged[topic] = Math.max(-1, Math.min(1, (merged[topic] || 0) + change * weight));
      }
    }
    
    // Remove very low interests
    for (const topic in merged) {
      if (Math.abs(merged[topic]) < 0.1) {
        delete merged[topic];
      }
    }
    
    return merged;
  }

  private mergeStrugglingConcepts(current: any[], updates: any[]): any[] {
    const conceptMap = new Map(
      current.map(c => [c.concept, c])
    );
    
    for (const update of updates) {
      const existing = conceptMap.get(update.concept);
      if (existing) {
        existing.severity = Math.max(existing.severity, update.severity);
        existing.last_seen = new Date().toISOString();
        existing.frequency = (existing.frequency || 1) + 1;
      } else {
        conceptMap.set(update.concept, {
          ...update,
          last_seen: new Date().toISOString(),
          frequency: 1
        });
      }
    }
    
    return Array.from(conceptMap.values());
  }

  private async mergeStrugglingConceptsEnhanced(
    current: any[], 
    updates: any[], 
    userId: string
  ): Promise<any[]> {
    const conceptMap = new Map(current.map(c => [c.concept, c]));
    
    // Get recent question performance for these concepts
    const conceptNames = [...updates.map(u => u.concept), ...current.map(c => c.concept)];
    const { data: recentPerformance } = await this.supabaseClient
      .from('user_question_responses')
      .select('questions!inner(explanation), is_correct, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .limit(100);
    
    // Analyze performance patterns
    const performanceMap = new Map<string, { correct: number, total: number }>();
    if (recentPerformance) {
      for (const response of recentPerformance) {
        const explanation = response.questions?.explanation || '';
        for (const concept of conceptNames) {
          if (explanation.toLowerCase().includes(concept.toLowerCase())) {
            const stats = performanceMap.get(concept) || { correct: 0, total: 0 };
            stats.total++;
            if (response.is_correct) stats.correct++;
            performanceMap.set(concept, stats);
          }
        }
      }
    }
    
    // Update concepts with performance data
    for (const update of updates) {
      const existing = conceptMap.get(update.concept);
      const performance = performanceMap.get(update.concept);
      
      let adjustedSeverity = update.severity;
      if (performance && performance.total >= 3) {
        // Adjust severity based on actual performance
        const accuracy = performance.correct / performance.total;
        adjustedSeverity = adjustedSeverity * 0.6 + (1 - accuracy) * 0.4;
      }
      
      if (existing) {
        existing.severity = Math.max(existing.severity * 0.8, adjustedSeverity);
        existing.last_seen = new Date().toISOString();
        existing.frequency = (existing.frequency || 1) + 1;
        existing.performance_accuracy = performance ? performance.correct / performance.total : null;
      } else {
        conceptMap.set(update.concept, {
          ...update,
          severity: adjustedSeverity,
          last_seen: new Date().toISOString(),
          frequency: 1,
          performance_accuracy: performance ? performance.correct / performance.total : null
        });
      }
    }
    
    // Remove concepts that have improved significantly
    const concepts = Array.from(conceptMap.values());
    return concepts.filter(c => {
      // Keep if severity is still high or recent
      const daysSinceSeen = (Date.now() - new Date(c.last_seen).getTime()) / (1000 * 60 * 60 * 24);
      return c.severity > 0.3 || daysSinceSeen < 7;
    });
  }

  private mergeMasteredConcepts(current: any[], updates: any[]): any[] {
    const conceptMap = new Map(
      current.map(c => [c.concept, c])
    );
    
    for (const update of updates) {
      conceptMap.set(update.concept, {
        ...update,
        last_demonstrated: new Date().toISOString()
      });
    }
    
    return Array.from(conceptMap.values());
  }

  private async mergeMasteredConceptsEnhanced(
    current: any[], 
    updates: any[], 
    userId: string
  ): Promise<any[]> {
    const conceptMap = new Map(current.map(c => [c.concept, c]));
    
    // Verify mastery with recent performance
    const conceptNames = [...updates.map(u => u.concept), ...current.map(c => c.concept)];
    const { data: recentPerformance } = await this.supabaseClient
      .from('user_question_responses')
      .select('questions!inner(explanation), is_correct, response_time_ms, created_at')
      .eq('user_id', userId)
      .eq('is_correct', true)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Last 14 days
      .limit(50);
    
    // Calculate mastery confidence
    for (const update of updates) {
      const relevantResponses = recentPerformance?.filter((r: any) => 
        r.questions?.explanation?.toLowerCase().includes(update.concept.toLowerCase())
      ) || [];
      
      let confidence = update.confidence;
      if (relevantResponses.length >= 2) {
        // Boost confidence if consistently correct with good response times
        const avgResponseTime = relevantResponses.reduce((sum: number, r: any) => sum + (r.response_time_ms || 0), 0) / relevantResponses.length;
        if (avgResponseTime < 15000) { // Under 15 seconds
          confidence = Math.min(0.95, confidence * 1.1);
        }
      }
      
      conceptMap.set(update.concept, {
        ...update,
        confidence,
        last_demonstrated: new Date().toISOString(),
        demonstration_count: (conceptMap.get(update.concept)?.demonstration_count || 0) + 1
      });
    }
    
    // Decay confidence for concepts not recently demonstrated
    const concepts = Array.from(conceptMap.values());
    return concepts.map(c => {
      const daysSinceDemonstrated = (Date.now() - new Date(c.last_demonstrated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDemonstrated > 30) {
        c.confidence *= 0.9; // 10% decay after 30 days
      }
      return c;
    }).filter(c => c.confidence > 0.4); // Remove low confidence masteries
  }

  private mergeEngagementMetrics(current: any, updates: any): any {
    const merged = { ...current };
    
    if (updates.clarification_requested) {
      merged.clarification_rate = ((merged.clarification_rate || 0) * 0.9 + 1 * 0.1);
    }
    
    if (updates.frustration_detected) {
      merged.frustration_events = (merged.frustration_events || 0) + 1;
    }
    
    if (updates.success_celebrated) {
      merged.success_celebrations = (merged.success_celebrations || 0) + 1;
    }
    
    return merged;
  }

  private mergeEngagementMetricsEnhanced(current: any, updates: any, totalInsights: number): any {
    const merged = { ...current };
    
    // Calculate rolling averages with proper decay
    const decayFactor = Math.min(0.95, 0.8 + totalInsights * 0.001);
    
    if (updates.clarification_requested !== undefined) {
      const currentRate = merged.clarification_rate || 0;
      const newValue = updates.clarification_requested ? 1 : 0;
      merged.clarification_rate = currentRate * decayFactor + newValue * (1 - decayFactor);
    }
    
    if (updates.frustration_detected) {
      merged.frustration_events = (merged.frustration_events || 0) + 1;
      merged.last_frustration = new Date().toISOString();
    }
    
    if (updates.success_celebrated) {
      merged.success_celebrations = (merged.success_celebrations || 0) + 1;
      merged.last_success = new Date().toISOString();
    }
    
    // Calculate engagement score
    merged.engagement_score = this.calculateEngagementScore(merged, totalInsights);
    
    return merged;
  }

  private calculateEngagementScore(metrics: any, totalInsights: number): number {
    if (totalInsights === 0) return 0.5;
    
    const factors = [
      1 - (metrics.clarification_rate || 0), // Lower clarification is better
      Math.min(1, (metrics.success_celebrations || 0) / (totalInsights * 0.1)), // Success rate
      Math.max(0, 1 - (metrics.frustration_events || 0) / (totalInsights * 0.2)), // Low frustration
    ];
    
    return factors.reduce((sum, f) => sum + f, 0) / factors.length;
  }
} 