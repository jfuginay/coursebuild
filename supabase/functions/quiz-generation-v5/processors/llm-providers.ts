/**
 * LLM Provider Interface - Unified interface for Gemini and OpenAI
 * 
 * Provides a consistent interface for text generation that can switch between
 * providers while maintaining the same API for question generation.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { getQuestionSchema } from './llm-schemas.ts';
import { langsmithLogger } from '../utils/langsmith-logger.ts';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface LLMUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

interface LLMResponse {
  content: any;
  usage: LLMUsage;
  provider: 'openai' | 'gemini';
  model: string;
}

interface LLMRequest {
  prompt: string;
  responseSchema: any;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    topK?: number;
    topP?: number;
  };
}

interface ProviderConfig {
  preferredProvider: 'openai' | 'gemini';
  fallbackProvider: 'openai' | 'gemini';
  retryAttempts: number;
  retryDelay: number;
  geminiApiKey?: string;
  openaiApiKey?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG: ProviderConfig = {
  preferredProvider: 'openai',
  fallbackProvider: 'gemini',
  retryAttempts: 3,
  retryDelay: 1000,
  geminiApiKey: Deno.env.get('GEMINI_API_KEY') || '',
  openaiApiKey: Deno.env.get('OPENAI_API_KEY') || ''
};

// =============================================================================
// Provider Implementations
// =============================================================================

class GeminiProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async generateResponse(prompt: string, questionType: string, config: any): Promise<LLMResponse> {
    console.log(`🤖 Generating ${questionType} with Gemini`);
    
    const schema = getQuestionSchema(questionType, 'gemini'); // Use Gemini-compatible schema
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
        candidateCount: 1,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };

    const url = `${this.baseUrl}/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`;
    
    // Create a descriptive run name based on question type
    const questionTypeLabels: Record<string, string> = {
      'multiple-choice': 'MCQ Generation',
      'true-false': 'True/False Generation',
      'matching': 'Matching Generation',
      'sequencing': 'Sequencing Generation',
      'hotspot': 'Hotspot Generation'
    };
    
    const runName = `Quiz Generation v5 - ${questionTypeLabels[questionType] || questionType} - Gemini`;
    
    // Use LangSmith logger for the API call
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log request to LangSmith with descriptive name
    const runId = await langsmithLogger.createRun(
      requestId,
      runName,
      {
        messages: [{
          role: 'user',
          content: prompt
        }],
        model: 'gemini-2.0-flash-exp',
        config: requestBody.generationConfig,
        question_type: questionType
      },
      {
        model: 'gemini-2.0-flash-exp',
        endpoint: 'generateContent',
        prompt_length: prompt.length,
        question_type: questionType
      },
      ['gemini', 'gemini-2.0-flash-exp', 'quiz-generation', 'text-generation', questionType]
    );
    
    if (!runId && langsmithLogger.isEnabled()) {
      console.warn('[LangSmith] Failed to create run, continuing without logging');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
        await langsmithLogger.logGeminiResponse(requestId, null, responseTime, error);
        throw error;
      }

      const data = await response.json();
      
      // Log the response to LangSmith
      await langsmithLogger.logGeminiResponse(requestId, data, responseTime);
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response structure from Gemini API');
      }

      const content = data.candidates[0].content.parts[0].text;
      let parsedContent;
      
      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to parse Gemini response as JSON: ${(error as Error).message}`);
      }

      return {
        content: parsedContent,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        },
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp'
      };
    } catch (error) {
      // If not already logged, log the error
      if (!(error instanceof Error && error.message.includes('Gemini API error'))) {
        await langsmithLogger.logGeminiResponse(requestId, null, Date.now() - startTime, error as Error);
      }
      throw error;
    }
  }
}

class OpenAIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async generateResponse(prompt: string, questionType: string, config: any): Promise<LLMResponse> {
    console.log(`🤖 Generating ${questionType} with OpenAI`);
    
    const schema = getQuestionSchema(questionType, 'openai'); // Use OpenAI-compatible schema
    
    const requestBody = {
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality quiz questions according to the provided schema.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: `${questionType.replace('-', '_')}_question`,
          schema: schema,
          strict: true
        }
      },
      temperature: config.temperature,
      max_tokens: config.maxOutputTokens,
      top_p: config.topP
    };

    // Create a descriptive run name based on question type
    const questionTypeLabels: Record<string, string> = {
      'multiple-choice': 'MCQ Generation',
      'true-false': 'True/False Generation', 
      'matching': 'Matching Generation',
      'sequencing': 'Sequencing Generation',
      'hotspot': 'Hotspot Generation'
    };
    
    const runName = `Quiz Generation v5 - ${questionTypeLabels[questionType] || questionType} - OpenAI`;

    // Use LangSmith logger for the API call
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log request to LangSmith with descriptive name
    const runId = await langsmithLogger.createRun(
      requestId,
      runName,
      {
        messages: requestBody.messages,
        model: requestBody.model,
        temperature: requestBody.temperature,
        max_tokens: requestBody.max_tokens,
        top_p: requestBody.top_p,
        response_format: requestBody.response_format,
        question_type: questionType
      },
      {
        model: 'gpt-4o-2024-08-06',
        endpoint: 'chat/completions',
        prompt_length: prompt.length,
        has_json_mode: true,
        question_type: questionType,
        schema_name: requestBody.response_format.json_schema.name
      },
      ['openai', 'gpt-4o-2024-08-06', 'quiz-generation', 'text-generation', questionType]
    );
    
    if (!runId && langsmithLogger.isEnabled()) {
      console.warn('[LangSmith] Failed to create run, continuing without logging');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
        await langsmithLogger.logOpenAIResponse(requestId, null, responseTime, error);
        throw error;
      }

      const data = await response.json();
      
      // Log the response to LangSmith
      await langsmithLogger.logOpenAIResponse(requestId, data, responseTime);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response structure from OpenAI API');
      }

      const content = data.choices[0].message.content;
      let parsedContent;
      
      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${(error as Error).message}`);
      }

      return {
        content: parsedContent,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        provider: 'openai',
        model: 'gpt-4o-2024-08-06'
      };
    } catch (error) {
      // If not already logged, log the error
      if (!(error instanceof Error && error.message.includes('OpenAI API error'))) {
        await langsmithLogger.logOpenAIResponse(requestId, null, Date.now() - startTime, error as Error);
      }
      throw error;
    }
  }
}

// =============================================================================
// Main LLM Service
// =============================================================================

export class LLMService {
  private config: ProviderConfig;
  private geminiProvider: GeminiProvider;
  private openaiProvider: OpenAIProvider;

  constructor(config: Partial<ProviderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.geminiProvider = new GeminiProvider(this.config.geminiApiKey || '');
    this.openaiProvider = new OpenAIProvider(this.config.openaiApiKey || '');
  }

  /**
   * Generate a question using the preferred provider or fallback
   */
  async generateQuestion(
    questionType: string,
    prompt: string,
    config: any
  ): Promise<LLMResponse> {
    const preferredProvider = config.preferredProvider || (questionType === 'hotspot' ? 'gemini' : 'openai');
    
    console.log(`🔄 Question Generation: Using ${preferredProvider} for ${questionType}`);
    
    try {
      if (preferredProvider === 'gemini' && this.geminiProvider) {
        return await this.geminiProvider.generateResponse(prompt, questionType, config);
      } else if (preferredProvider === 'openai' && this.openaiProvider) {
        return await this.openaiProvider.generateResponse(prompt, questionType, config);
      } else {
        throw new Error(`Preferred provider ${preferredProvider} not available`);
      }
    } catch (error) {
      console.warn(`⚠️ Primary provider failed, attempting fallback...`, error);
      
      // Try fallback provider
      if (preferredProvider === 'gemini' && this.openaiProvider) {
        console.log(`🔄 Fallback: Using OpenAI for ${questionType}`);
        return await this.openaiProvider.generateResponse(prompt, questionType, config);
      } else if (preferredProvider === 'openai' && this.geminiProvider) {
        console.log(`🔄 Fallback: Using Gemini for ${questionType}`);
        return await this.geminiProvider.generateResponse(prompt, questionType, config);
      }
      
      throw new Error(`All providers failed for ${questionType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async attemptGeneration(
    provider: 'openai' | 'gemini',
    questionType: string,
    prompt: string,
    config: any
  ): Promise<LLMResponse> {
    const providerInstance = provider === 'openai' ? this.openaiProvider : this.geminiProvider;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await providerInstance.generateResponse(prompt, questionType, config);
        return result;
      } catch (error) {
        console.warn(`⚠️ ${provider} attempt ${attempt} failed: ${(error as Error).message}`);
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`${provider} failed after ${this.config.retryAttempts} attempts`);
  }

  /**
   * Set provider configuration
   */
  setConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  // =============================================================================
  // Health Check and Testing
  // =============================================================================

  /**
   * Check if both providers are available and working
   */
  async checkProviderHealth(): Promise<{ gemini: boolean; openai: boolean }> {
    const testPrompt = "Generate a simple test question about basic mathematics.";
    const testConfig = {
      temperature: 0.5,
      maxOutputTokens: 100,
      topK: 30,
      topP: 0.8
    };

    const [geminiResult, openaiResult] = await Promise.allSettled([
      this.attemptGeneration('gemini', 'multiple-choice', testPrompt, testConfig),
      this.attemptGeneration('openai', 'multiple-choice', testPrompt, testConfig)
    ]);

    return {
      gemini: geminiResult.status === 'fulfilled',
      openai: openaiResult.status === 'fulfilled'
    };
  }

  /**
   * Get usage statistics for the current session
   */
  getUsageStats(): { totalTokens: number; costEstimate: number } {
    // This would be implemented to track usage across all requests
    return {
      totalTokens: 0,
      costEstimate: 0
    };
  }
}

// =============================================================================
// Exports
// =============================================================================

export default LLMService;
export type { LLMResponse, LLMRequest, ProviderConfig };

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a default LLM service instance
 */
export const createLLMService = (config?: Partial<ProviderConfig>): LLMService => {
  return new LLMService(config);
};

/**
 * Enhanced JSON cleaning function (moved from MCQ processor)
 */
export const cleanJsonResponse = (jsonString: string): string => {
  let cleaned = jsonString
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/": "([^"]*)"([^",\]}]*)"([^"]*)",?/g, '": "$1\\"$2\\"$3",')
    .replace(/": "([^"]*)"([^",\]}\n]*)",/g, '": "$1\\"$2",')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
    .replace(/": "([^"]*)\n([^"]*)",/g, '": "$1\\n$2",')
    .trim();
  
  if (!cleaned.startsWith('{')) {
    const startIndex = cleaned.indexOf('{');
    if (startIndex !== -1) {
      cleaned = cleaned.substring(startIndex);
    }
  }
  
  if (!cleaned.endsWith('}')) {
    const endIndex = cleaned.lastIndexOf('}');
    if (endIndex !== -1) {
      cleaned = cleaned.substring(0, endIndex + 1);
    }
  }
  
  return cleaned;
};

// =============================================================================
// Export Default Service Instance
// =============================================================================

export const llmService = createLLMService();

// =============================================================================
// Provider Status and Health Check
// =============================================================================

export const checkProviderHealth = async (): Promise<{
  gemini: boolean;
  openai: boolean;
  timestamp: number;
}> => {
  const testPrompt = "Generate a simple test response with a single field called 'test' with value 'ok'";
  const testConfig = {
    temperature: 0.1,
    maxOutputTokens: 50,
    topK: 30,
    topP: 0.8
  };

  console.log('🏥 Running provider health check...');

  const [geminiResult, openaiResult] = await Promise.allSettled([
    new GeminiProvider(Deno.env.get('GEMINI_API_KEY') || '').generateResponse(testPrompt, 'multiple-choice', testConfig),
    new OpenAIProvider(Deno.env.get('OPENAI_API_KEY') || '').generateResponse(testPrompt, 'multiple-choice', testConfig)
  ]);

  const result = {
    gemini: geminiResult.status === 'fulfilled',
    openai: openaiResult.status === 'fulfilled',
    timestamp: Date.now()
  };

  console.log('🏥 Health check results:', {
    gemini: result.gemini ? '✅' : '❌',
    openai: result.openai ? '✅' : '❌'
  });

  return result;
}; 