/**
 * LangSmith Logger for LLM API Calls
 * 
 * This module provides integration with LangSmith for logging and tracing
 * LLM API calls in the enhanced recommendations pipeline.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// =============================================================================
// Types and Interfaces
// =============================================================================

interface LangSmithRun {
  id: string;
  name: string;
  run_type: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  start_time: string;
  end_time?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

// =============================================================================
// Configuration
// =============================================================================

const LANGSMITH_API_URL = 'https://api.smith.langchain.com/api/v1';
const DEFAULT_PROJECT_NAME = 'enhanced-recommendations';

// =============================================================================
// Main LangSmith Logger Class
// =============================================================================

export class LangSmithLogger {
  private apiKey: string;
  private projectName: string;
  private apiUrl: string;
  private enabled: boolean;
  private runMap: Map<string, string>; // Maps our request IDs to LangSmith run IDs

  constructor(config?: {
    apiKey?: string;
    projectName?: string;
    apiUrl?: string;
  }) {
    this.apiKey = config?.apiKey || Deno.env.get('LANGSMITH_API_KEY') || '';
    this.projectName = config?.projectName || Deno.env.get('LANGSMITH_PROJECT') || DEFAULT_PROJECT_NAME;
    this.apiUrl = config?.apiUrl || LANGSMITH_API_URL;
    this.enabled = !!this.apiKey;
    this.runMap = new Map();

    if (!this.enabled) {
      console.warn('[LangSmith] No API key found. Logging disabled.');
      console.warn('[LangSmith] Set LANGSMITH_API_KEY environment variable to enable.');
    } else {
      console.log(`[LangSmith] Initialized with:`);
      console.log(`[LangSmith]   API Key: ${this.apiKey.substring(0, 8)}...`);
      console.log(`[LangSmith]   Project: ${this.projectName}`);
      console.log(`[LangSmith]   API URL: ${this.apiUrl}`);
    }
  }

  /**
   * Create a new run in LangSmith
   */
  async createRun(
    requestId: string,
    name: string,
    inputs: Record<string, any>,
    metadata?: Record<string, any>,
    tags?: string[]
  ): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      // Pre-generate the run ID as required by LangSmith API
      const runId = crypto.randomUUID();
      
      // Add timestamp to run data
      const runData = {
        id: runId,
        name,
        run_type: 'llm' as const,
        inputs,
        start_time: new Date().toISOString(),
        // Use session_name to specify the project
        session_name: this.projectName,
        metadata,
        tags: tags || ['recommendations', 'personalization']
      };

      console.log(`[LangSmith] Creating run with ID: ${runId}`);
      console.log(`[LangSmith] Project (session_name): ${this.projectName}`);
      console.log(`[LangSmith] Request ID: ${requestId}`);
      
      const response = await fetch(`${this.apiUrl}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(runData)
      });

      const responseText = await response.text();
      console.log(`[LangSmith] Response status: ${response.status}`);
      
      // Log all headers for debugging
      console.log('[LangSmith] Response headers:');
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
      
      if (!response.ok && response.status !== 202) {
        console.error(`[LangSmith] Failed to create run: ${response.status} - ${responseText}`);
        return null;
      }

      // For 202 or 200 responses, the run was created successfully
      if (response.status === 202 || response.status === 200 || response.status === 201) {
        console.log('[LangSmith] Run creation successful');
        // Map our request ID to the pre-generated run ID
        this.runMap.set(requestId, runId);
        console.log(`[LangSmith] Mapped request ${requestId} to run ${runId}`);
        
        const traceUrl = `https://smith.langchain.com/o/2babae4e-90cf-496a-89ff-ceacb130c2cb/projects/p/${this.projectName}/r/${runId}`;
        console.log(`[LangSmith] Created run: ${runId}`);
        console.log(`[LangSmith] View trace: ${traceUrl}`);
        return runId;
      }

      // Try to parse response for any additional info
      if (responseText) {
        try {
          const result = JSON.parse(responseText);
          console.log('[LangSmith] Response body:', result);
        } catch (e) {
          // Response might not be JSON
        }
      }

      console.error('[LangSmith] Unexpected response status:', response.status);
      return null;

    } catch (error) {
      console.error('[LangSmith] Error creating run:', error);
      return null;
    }
  }

  /**
   * Update a run with outputs or error
   */
  async updateRun(
    requestId: string,
    outputs?: Record<string, any>,
    error?: string,
    extra?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) return;

    console.log(`[LangSmith] Updating run for request: ${requestId}`);
    
    const runId = this.runMap.get(requestId);
    if (!runId) {
      console.warn(`[LangSmith] No run found for request: ${requestId}`);
      console.warn(`[LangSmith] Available request IDs:`, Array.from(this.runMap.keys()).slice(0, 5));
      return;
    }

    try {
      const updateData: Record<string, any> = {
        end_time: new Date().toISOString()
      };

      if (outputs) {
        updateData.outputs = outputs;
      }

      if (error) {
        updateData.error = error;
        updateData.status = 'error';
      }

      if (extra) {
        updateData.extra = extra;
      }

      console.log(`[LangSmith] Updating run ${runId} with status: ${error ? 'error' : 'success'}`);

      const response = await fetch(`${this.apiUrl}/runs/${runId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LangSmith] Failed to update run: ${response.status} - ${errorText}`);
        return;
      }

      const traceUrl = this.getTraceUrl(requestId);
      console.log(`[LangSmith] Completed run: ${runId}`);
      if (traceUrl) {
        console.log(`[LangSmith] View complete trace: ${traceUrl}`);
      }

    } catch (error) {
      console.error('[LangSmith] Error updating run:', error);
    }
  }

  /**
   * Log a Gemini API request
   */
  async logGeminiRequest(
    requestId: string,
    model: string,
    prompt: string,
    config: any,
    videoMetadata?: any
  ): Promise<string | null> {
    if (!this.enabled) return null;

    const inputs = {
      messages: [{
        role: 'user',
        content: prompt
      }],
      model,
      config,
      ...(videoMetadata && { video_metadata: videoMetadata })
    };

    const metadata = {
      model,
      endpoint: 'generateContent',
      prompt_length: prompt.length,
      has_video: !!videoMetadata,
      ...(videoMetadata && {
        video_url: videoMetadata.fileUri,
        video_fps: videoMetadata.fps,
        start_offset: videoMetadata.startOffset,
        end_offset: videoMetadata.endOffset
      })
    };

    const tags = [
      'gemini',
      model,
      'recommendations',
      videoMetadata ? 'video-analysis' : 'text-only'
    ];

    // Wait for run creation and return the run ID
    const runId = await this.createRun(
      requestId,
      `Enhanced Recommendations - Gemini ${model}`,
      inputs,
      metadata,
      tags
    );
    
    return runId;
  }

  /**
   * Log a Gemini API response
   */
  async logGeminiResponse(
    requestId: string,
    response: any,
    responseTime: number,
    error?: Error
  ): Promise<void> {
    if (!this.enabled) return;

    if (error) {
      await this.updateRun(
        requestId,
        undefined,
        error.message,
        {
          error_type: error.name,
          response_time_ms: responseTime
        }
      );
    } else {
      // Extract the actual text response from Gemini format
      let responseText = '';
      let parsedContent = null;
      
      try {
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = response.candidates[0].content.parts[0].text;
          // Try to parse as JSON if it looks like JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            parsedContent = JSON.parse(responseText);
          }
        }
      } catch (e) {
        // If parsing fails, just use the raw text
        console.log('[LangSmith] Could not parse response as JSON, using raw text');
      }

      // Format outputs according to LangSmith LLM run expectations
      const outputs = {
        generations: [[{
          text: responseText,
          generation_info: {
            finish_reason: response?.candidates?.[0]?.finishReason || 'stop',
            safety_ratings: response?.candidates?.[0]?.safetyRatings || [],
            ...(parsedContent && { parsed_content: parsedContent })
          }
        }]],
        llm_output: {
          token_usage: response?.usageMetadata || response?.usage,
          model_name: 'gemini',
          system_fingerprint: response?.modelVersion
        }
      };

      const extra = {
        response_time_ms: responseTime,
        response_length: responseText.length,
        ...(response?.usageMetadata && {
          prompt_tokens: response.usageMetadata.promptTokenCount,
          completion_tokens: response.usageMetadata.candidatesTokenCount,
          total_tokens: response.usageMetadata.totalTokenCount
        })
      };

      await this.updateRun(requestId, outputs, undefined, extra);
    }
  }

  /**
   * Log an OpenAI API request
   */
  async logOpenAIRequest(
    requestId: string,
    model: string,
    prompt: string,
    requestBody: any
  ): Promise<string | null> {
    if (!this.enabled) return null;

    const inputs = {
      messages: requestBody.messages || [{ role: 'user', content: prompt }],
      model,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens,
      top_p: requestBody.top_p,
      ...(requestBody.response_format && { response_format: requestBody.response_format })
    };

    const metadata = {
      model,
      endpoint: 'chat/completions',
      prompt_length: prompt.length,
      has_json_mode: !!requestBody.response_format,
      ...(requestBody.response_format?.json_schema && {
        schema_name: requestBody.response_format.json_schema.name
      })
    };

    const tags = [
      'openai',
      model,
      'recommendations',
      'text-only'
    ];

    // Wait for run creation and return the run ID
    const runId = await this.createRun(
      requestId,
      `Enhanced Recommendations - OpenAI ${model}`,
      inputs,
      metadata,
      tags
    );
    
    return runId;
  }

  /**
   * Log an OpenAI API response
   */
  async logOpenAIResponse(
    requestId: string,
    response: any,
    responseTime: number,
    error?: Error
  ): Promise<void> {
    if (!this.enabled) return;

    if (error) {
      await this.updateRun(
        requestId,
        undefined,
        error.message,
        {
          error_type: error.name,
          response_time_ms: responseTime
        }
      );
    } else {
      // Extract the actual text response from OpenAI format
      let responseText = '';
      let parsedContent = null;
      
      try {
        if (response?.choices?.[0]?.message?.content) {
          responseText = response.choices[0].message.content;
          // Try to parse as JSON if it looks like JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            parsedContent = JSON.parse(responseText);
          }
        }
      } catch (e) {
        // If parsing fails, just use the raw text
        console.log('[LangSmith] Could not parse response as JSON, using raw text');
      }

      // Format outputs according to LangSmith LLM run expectations
      const outputs = {
        generations: [[{
          text: responseText,
          generation_info: {
            finish_reason: response?.choices?.[0]?.finish_reason || 'stop',
            model: response?.model,
            ...(parsedContent && { parsed_content: parsedContent })
          }
        }]],
        llm_output: {
          token_usage: {
            prompt_tokens: response?.usage?.prompt_tokens || 0,
            completion_tokens: response?.usage?.completion_tokens || 0,
            total_tokens: response?.usage?.total_tokens || 0
          },
          model_name: response?.model || 'gpt-4o-2024-08-06',
          system_fingerprint: response?.system_fingerprint
        }
      };

      const extra = {
        response_time_ms: responseTime,
        response_length: responseText.length,
        prompt_tokens: response?.usage?.prompt_tokens || 0,
        completion_tokens: response?.usage?.completion_tokens || 0,
        total_tokens: response?.usage?.total_tokens || 0
      };

      await this.updateRun(requestId, outputs, undefined, extra);
    }
  }

  /**
   * Make a logged API call (wrapper for fetch)
   */
  async makeAPICall(
    url: string,
    requestBody: any,
    options: { 
      model?: string;
      description?: string;
    } = {}
  ): Promise<Response> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract info from request
    const model = options.model || this.extractModelFromUrl(url);
    const prompt = this.extractPromptFromBody(requestBody);
    const config = requestBody.generationConfig || {};
    const videoMetadata = this.extractVideoMetadata(requestBody);
    
    // Log to console if description provided
    if (options.description) {
      console.log(`\n🎯 ${options.description}`);
    }
    
    // Log request to LangSmith and wait for run creation
    const runId = await this.logGeminiRequest(requestId, model, prompt, config, videoMetadata);
    
    if (!runId && this.enabled) {
      console.warn('[LangSmith] Failed to create run, continuing without logging');
    }
    
    try {
      // Make the actual API call
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API error: ${response.status} - ${errorText}`);
        await this.logGeminiResponse(requestId, null, responseTime, error);
        throw error;
      }
      
      // Clone response to read it without consuming
      const responseClone = response.clone();
      const responseData = await responseClone.json();
      
      // Log response to LangSmith
      await this.logGeminiResponse(requestId, responseData, responseTime);
      
      return response;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.logGeminiResponse(requestId, null, responseTime, error as Error);
      throw error;
    }
  }

  /**
   * Extract model from URL
   */
  private extractModelFromUrl(url: string): string {
    const match = url.match(/models\/([^:]+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Extract prompt from request body
   */
  private extractPromptFromBody(body: any): string {
    if (body.contents && body.contents[0] && body.contents[0].parts) {
      const textPart = body.contents[0].parts.find((p: any) => p.text);
      return textPart?.text || 'No text prompt found';
    }
    return 'Unable to extract prompt';
  }

  /**
   * Extract video metadata from request body
   */
  private extractVideoMetadata(body: any): any {
    if (body.contents && body.contents[0] && body.contents[0].parts) {
      const videoPart = body.contents[0].parts.find((p: any) => p.fileData || p.videoMetadata);
      if (videoPart) {
        return {
          fileUri: videoPart.fileData?.fileUri,
          ...videoPart.videoMetadata
        };
      }
    }
    return null;
  }

  /**
   * Get the LangSmith trace URL for a request
   */
  getTraceUrl(requestId: string): string | null {
    const runId = this.runMap.get(requestId);
    if (!runId) return null;
    
    return `https://smith.langchain.com/o/2babae4e-90cf-496a-89ff-ceacb130c2cb/projects/p/${this.projectName}/r/${runId}`;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// =============================================================================
// Default Instance
// =============================================================================

export const langsmithLogger = new LangSmithLogger();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Log a Gemini API call with LangSmith
 */
export const logGeminiCall = async (
  url: string,
  requestBody: any,
  description?: string
): Promise<Response> => {
  return langsmithLogger.makeAPICall(url, requestBody, { description });
};

/**
 * Log an OpenAI API call with LangSmith
 */
export const logOpenAICall = async (
  url: string,
  requestBody: any,
  description?: string,
  apiKey?: string
): Promise<Response> => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Extract info from request
  const model = requestBody.model || 'gpt-4o-2024-08-06';
  const prompt = requestBody.messages?.find((m: any) => m.role === 'user')?.content || 'No prompt found';
  
  // Log to console if description provided
  if (description) {
    console.log(`\n🎯 ${description}`);
  }
  
  // Log request to LangSmith
  const runId = await langsmithLogger.logOpenAIRequest(requestId, model, prompt, requestBody);
  
  if (!runId && langsmithLogger.isEnabled()) {
    console.warn('[LangSmith] Failed to create run, continuing without logging');
  }
  
  try {
    // Make the actual API call
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || Deno.env.get('OPENAI_API_KEY')}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`API error: ${response.status} - ${errorText}`);
      await langsmithLogger.logOpenAIResponse(requestId, null, responseTime, error);
      throw error;
    }
    
    // Clone response to read it without consuming
    const responseClone = response.clone();
    const responseData = await responseClone.json();
    
    // Log response to LangSmith
    await langsmithLogger.logOpenAIResponse(requestId, responseData, responseTime);
    
    return response;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await langsmithLogger.logOpenAIResponse(requestId, null, responseTime, error as Error);
    throw error;
  }
}; 