import { EdgeFunctionContext, TranscriptSegment } from './types.ts';
import { logOpenAICall } from '../quiz-generation-v5/utils/langsmith-logger.ts';

// Deno-compatible OpenAI import
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

export interface VisualContent {
  type: 'mermaid' | 'chart' | 'table' | 'mindmap';
  code: string;
  title?: string;
  description?: string;
  interactionHints?: string[];
}

export interface VisualGenerationContext {
  topic: string;
  concepts: string[];
  relationships: Array<[string, string, string]>; // [from, to, relationship]
  complexity: 'simple' | 'moderate' | 'complex';
  learningObjective: string;
}

export class VisualGenerator {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async detectVisualNeed(
    message: string,
    context: EdgeFunctionContext
  ): Promise<{
    shouldGenerate: boolean;
    visualType: string;
    confidence: number;
    justification?: string;
  }> {
    // More conservative pattern matching - only for explicit visual requests
    const visualPatterns = {
      flowchart: /(?:show|create|draw|make|generate).*(?:flow ?chart|process diagram|workflow)/i,
      mindmap: /(?:show|create|draw|make|generate).*(?:mind ?map|concept map)/i,
      sequence: /(?:show|create|draw|make|generate).*(?:sequence|interaction) diagram/i,
      comparison: /(?:show|create|draw|make|generate).*(?:comparison|versus|vs) (?:chart|diagram|table)/i,
      timeline: /(?:show|create|draw|make|generate).*timeline/i,
      general: /(?:show|create|draw|make|generate).*(?:diagram|chart|visual|illustration|graphic)/i
    };

    // Check for explicit diagram request patterns
    for (const [type, pattern] of Object.entries(visualPatterns)) {
      if (pattern.test(message)) {
        console.log(`🎯 Explicit visual request detected: ${type}`);
        return {
          shouldGenerate: true,
          visualType: type === 'general' ? 'flowchart' : type, // Default to flowchart for general requests
          confidence: 0.9,
          justification: 'User explicitly requested a visual diagram'
        };
      }
    }

    // For non-explicit requests, use LLM with strict criteria
    return this.llmDetectVisualNeed(message, context);
  }

  private async llmDetectVisualNeed(
    message: string,
    context: EdgeFunctionContext
  ): Promise<{
    shouldGenerate: boolean;
    visualType: string;
    confidence: number;
    justification?: string;
  }> {
    const prompt = `
You are evaluating whether a visual diagram would TRULY benefit the student's understanding.

BE VERY SELECTIVE - Only recommend a visual when it would significantly enhance comprehension beyond what text can provide.

Message: "${message}"
Context: Student is learning from a video about ${this.extractTopicFromTranscript(context.courseContext.playedTranscriptSegments)}

Criteria for recommending a visual:
1. Complex relationships that are hard to understand in text (e.g., multi-step processes, hierarchies)
2. Comparisons with multiple dimensions that benefit from side-by-side visualization
3. Temporal sequences where seeing the flow is crucial
4. Concepts with spatial or structural relationships
5. User explicitly asks for a visual/diagram/chart

DO NOT generate a visual for:
- Simple explanations that work well in text
- Basic definitions or single concepts
- Questions that don't involve relationships or processes
- General chat or clarifications

If a visual would help, specify:
- Type: flowchart, mindmap, sequence, comparison, timeline, or none
- Justification: Clear explanation of WHY this specific visual adds value

Respond with JSON: {
  "shouldGenerate": boolean,
  "visualType": string,
  "confidence": number,
  "justification": string (required if shouldGenerate is true)
}
`;

    try {
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200
      });

      const result = JSON.parse(response);
      
      // Log the decision and justification
      console.log('🤔 Visual detection decision:', {
        shouldGenerate: result.shouldGenerate,
        visualType: result.visualType,
        confidence: result.confidence,
        justification: result.justification
      });
      
      return {
        shouldGenerate: result.shouldGenerate || false,
        visualType: result.visualType || 'none',
        confidence: result.confidence || 0.5,
        justification: result.justification
      };
    } catch (error) {
      console.error('❌ Error in visual detection:', error);
      return { shouldGenerate: false, visualType: 'none', confidence: 0 };
    }
  }

  async generateVisual(
    context: VisualGenerationContext,
    type: string,
    edgeContext?: EdgeFunctionContext
  ): Promise<VisualContent> {
    console.log(`🎨 Generating ${type} visual with full transcript context`);
    
    // Get transcript context for the prompt
    const transcriptContext = this.getTranscriptContext(edgeContext);
    
    switch (type) {
      case 'flowchart':
        return this.generateFlowchart(context, transcriptContext);
      case 'mindmap':
        return this.generateMindMap(context, transcriptContext);
      case 'sequence':
        return this.generateSequenceDiagram(context, transcriptContext);
      case 'comparison':
        return this.generateComparisonChart(context, transcriptContext);
      case 'timeline':
        return this.generateTimeline(context, transcriptContext);
      default:
        return this.generateAutomatic(context, transcriptContext);
    }
  }

  private getTranscriptContext(edgeContext?: EdgeFunctionContext): string {
    if (!edgeContext || !edgeContext.courseContext.playedTranscriptSegments.length) {
      return 'No transcript context available.';
    }

    const segments = edgeContext.courseContext.playedTranscriptSegments;
    const fullTranscript = segments
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(segment => {
        const timestamp = Math.floor(segment.timestamp / 60) + ":" + Math.floor(segment.timestamp % 60).toString().padStart(2, '0');
        return `[${timestamp}] ${segment.text}`;
      })
      .join('\n');

    // Limit to last 5000 characters if too long
    if (fullTranscript.length > 5000) {
      return '... (earlier content truncated)\n' + fullTranscript.slice(-5000);
    }

    return fullTranscript;
  }

  private async generateFlowchart(context: VisualGenerationContext, transcriptContext: string): Promise<VisualContent> {
    const prompt = `
Based on the following video transcript, generate a Mermaid flowchart that visualizes the main concepts and processes discussed.

VIDEO TRANSCRIPT:
${transcriptContext}

USER'S QUESTION/CONTEXT:
${context.topic}

Requirements:
1. Focus on the actual content from the transcript
2. Use clear, educational labels based on what was discussed
3. Show logical flow with decision points if relevant
4. Keep it focused and readable
5. Use proper Mermaid flowchart syntax
6. IMPORTANT: Avoid using pipe characters (|) in node labels. Use "magnitude of" or "norm" instead of |V| notation.

IMPORTANT: Generate your response in the following JSON format:
{
  "title": "A clear, descriptive title for this flowchart based on the content",
  "description": "A detailed explanation of what this flowchart shows and how it relates to the video content",
  "mermaidCode": "The actual Mermaid flowchart code starting with 'flowchart TD' or 'flowchart LR'"
}
`;

    try {
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Mermaid diagram expert. Generate valid Mermaid syntax and provide clear titles and descriptions. Avoid using pipe characters (|) in node labels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800
      });

      const result = JSON.parse(response.trim());
      console.log('📊 Generated flowchart with title:', result.title);
      
      // Clean the mermaid code if needed
      let mermaidCode = result.mermaidCode || '';
      if (mermaidCode.startsWith('```')) {
        mermaidCode = mermaidCode.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      
      // Apply sanitization
      mermaidCode = this.sanitizeMermaidCode(mermaidCode);
      
      return {
        type: 'mermaid',
        code: mermaidCode,
        title: result.title || 'Process Flow from Video Content',
        description: result.description || 'Visual representation based on the video transcript',
        interactionHints: [
          'Follow the arrows to understand the flow',
          'Decision points show different paths'
        ]
      };
    } catch (error) {
      console.error('❌ Error generating flowchart:', error);
      // Fallback approach
      const mermaidCode = await this.generateMermaidWithLLM(
        prompt.split('IMPORTANT:')[0] + 'Return ONLY valid Mermaid code starting with "flowchart TD" or "flowchart LR". Avoid using pipe characters (|) in node labels.'
      );
      
      return {
        type: 'mermaid',
        code: this.sanitizeMermaidCode(mermaidCode),
        title: `Process Flow from Video Content`,
        description: `Visual representation based on the video transcript`,
        interactionHints: [
          'Follow the arrows to understand the flow',
          'Decision points show different paths'
        ]
      };
    }
  }

  private async generateMindMap(context: VisualGenerationContext, transcriptContext: string): Promise<VisualContent> {
    const prompt = `
Based on the following video transcript, generate a Mermaid mind map that shows the key concepts and their relationships.

VIDEO TRANSCRIPT:
${transcriptContext}

USER'S QUESTION/CONTEXT:
${context.topic}

Requirements:
1. Extract the main topic and key concepts from the transcript
2. Use central topic as root
3. Branch out to main concepts discussed
4. Include sub-concepts where mentioned
5. Keep labels concise but meaningful
6. Use proper Mermaid mindmap syntax
7. IMPORTANT: Avoid using pipe characters (|) in node labels. Use "magnitude of" or "norm" instead of |V| notation.

IMPORTANT: Generate your response in the following JSON format:
{
  "title": "A clear, descriptive title for this mind map based on the content",
  "description": "A detailed explanation of the concepts shown and their relationships from the video",
  "mermaidCode": "The actual Mermaid mindmap code starting with 'mindmap'"
}
`;

    try {
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Mermaid diagram expert. Generate valid Mermaid syntax and provide clear titles and descriptions. Avoid using pipe characters (|) in node labels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800
      });

      const result = JSON.parse(response.trim());
      console.log('📊 Generated mindmap with title:', result.title);
      
      // Clean the mermaid code if needed
      let mermaidCode = result.mermaidCode || '';
      if (mermaidCode.startsWith('```')) {
        mermaidCode = mermaidCode.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      
      // Apply sanitization
      mermaidCode = this.sanitizeMermaidCode(mermaidCode);
      
      return {
        type: 'mermaid',
        code: mermaidCode,
        title: result.title || 'Concept Map from Video',
        description: result.description || 'Conceptual overview based on the video content',
        interactionHints: [
          'Explore from center outward',
          'Each branch represents a related concept'
        ]
      };
    } catch (error) {
      console.error('❌ Error generating mindmap:', error);
      // Fallback approach
      const mermaidCode = await this.generateMermaidWithLLM(
        prompt.split('IMPORTANT:')[0] + 'Return ONLY valid Mermaid code starting with "mindmap". Avoid using pipe characters (|) in node labels.'
      );
      
      return {
        type: 'mermaid',
        code: this.sanitizeMermaidCode(mermaidCode),
        title: `Concept Map from Video`,
        description: `Conceptual overview based on the video content`,
        interactionHints: [
          'Explore from center outward',
          'Each branch represents a related concept'
        ]
      };
    }
  }

  private async generateSequenceDiagram(context: VisualGenerationContext, transcriptContext: string): Promise<VisualContent> {
    const prompt = `
Based on the following video transcript, generate a Mermaid sequence diagram that shows any processes, interactions, or step-by-step sequences discussed.

VIDEO TRANSCRIPT:
${transcriptContext}

USER'S QUESTION/CONTEXT:
${context.topic}

Requirements:
1. Identify the actors/participants from the transcript
2. Show the sequence of events or interactions
3. Include any loops or conditions mentioned
4. Keep messages descriptive but concise
5. Use proper Mermaid sequenceDiagram syntax
6. IMPORTANT: Avoid using pipe characters (|) in labels. Use alternative notations like "magnitude of" or "norm".

IMPORTANT: Generate your response in the following JSON format:
{
  "title": "A clear, descriptive title for this sequence diagram based on the content",
  "description": "A detailed explanation of the process or interaction sequence shown from the video",
  "mermaidCode": "The actual Mermaid sequence diagram code starting with 'sequenceDiagram'"
}
`;

    try {
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Mermaid diagram expert. Generate valid Mermaid syntax and provide clear titles and descriptions. Avoid using pipe characters (|) in node labels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800
      });

      const result = JSON.parse(response.trim());
      console.log('📊 Generated sequence diagram with title:', result.title);
      
      // Clean the mermaid code if needed
      let mermaidCode = result.mermaidCode || '';
      if (mermaidCode.startsWith('```')) {
        mermaidCode = mermaidCode.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      
      // Apply sanitization
      mermaidCode = this.sanitizeMermaidCode(mermaidCode);
      
      return {
        type: 'mermaid',
        code: mermaidCode,
        title: result.title || 'Sequence from Video Content',
        description: result.description || 'Step-by-step process based on the video',
        interactionHints: [
          'Read from top to bottom',
          'Arrows show the flow of events'
        ]
      };
    } catch (error) {
      console.error('❌ Error generating sequence diagram:', error);
      // Fallback approach
      const mermaidCode = await this.generateMermaidWithLLM(
        prompt.split('IMPORTANT:')[0] + 'Return ONLY valid Mermaid code starting with "sequenceDiagram". Avoid using pipe characters (|) in node labels.'
      );
      
      return {
        type: 'mermaid',
        code: this.sanitizeMermaidCode(mermaidCode),
        title: `Sequence from Video Content`,
        description: `Step-by-step process based on the video`,
        interactionHints: [
          'Read from top to bottom',
          'Arrows show the flow of events'
        ]
      };
    }
  }

  private async generateComparisonChart(context: VisualGenerationContext, transcriptContext: string): Promise<VisualContent> {
    const prompt = `
Based on the following video transcript, generate a Mermaid graph that compares or contrasts the concepts discussed.

VIDEO TRANSCRIPT:
${transcriptContext}

USER'S QUESTION/CONTEXT:
${context.topic}

Requirements:
1. Identify what needs to be compared from the transcript
2. Create subgraphs for each concept being compared
3. List key characteristics of each based on the video content
4. Show the main differences clearly
5. Use proper Mermaid graph syntax
6. IMPORTANT: Avoid using pipe characters (|) in node labels. Use alternative notations like "magnitude of" or "norm".

IMPORTANT: Generate your response in the following JSON format:
{
  "title": "A clear, descriptive title for this comparison based on the content",
  "description": "A detailed explanation of what is being compared and the key differences/similarities from the video",
  "mermaidCode": "The actual Mermaid graph code starting with 'graph TB' or 'graph LR'"
}
`;

    try {
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Mermaid diagram expert. Generate valid Mermaid syntax and provide clear titles and descriptions. Avoid using pipe characters (|) in node labels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800
      });

      const result = JSON.parse(response.trim());
      console.log('📊 Generated comparison chart with title:', result.title);
      
      // Clean the mermaid code if needed
      let mermaidCode = result.mermaidCode || '';
      if (mermaidCode.startsWith('```')) {
        mermaidCode = mermaidCode.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      
      // Apply sanitization
      mermaidCode = this.sanitizeMermaidCode(mermaidCode);
      
      return {
        type: 'mermaid',
        code: mermaidCode,
        title: result.title || 'Comparison from Video',
        description: result.description || 'Visual comparison based on the video content',
        interactionHints: [
          'Compare features side by side',
          'Notice the connections between concepts'
        ]
      };
    } catch (error) {
      console.error('❌ Error generating comparison chart:', error);
      // Fallback approach
      const mermaidCode = await this.generateMermaidWithLLM(
        prompt.split('IMPORTANT:')[0] + 'Return ONLY valid Mermaid code starting with "graph TB" or "graph LR". Avoid using pipe characters (|) in node labels.'
      );
      
      return {
        type: 'mermaid',
        code: this.sanitizeMermaidCode(mermaidCode),
        title: `Comparison from Video`,
        description: `Visual comparison based on the video content`,
        interactionHints: [
          'Compare features side by side',
          'Notice the connections between concepts'
        ]
      };
    }
  }

  private async generateTimeline(context: VisualGenerationContext, transcriptContext: string): Promise<VisualContent> {
    const prompt = `
Based on the following video transcript, generate a Mermaid timeline showing the chronological events or progression discussed.

VIDEO TRANSCRIPT:
${transcriptContext}

USER'S QUESTION/CONTEXT:
${context.topic}

Requirements:
1. Extract temporal events or progression from the transcript
2. Use chronological order
3. Include timestamps or periods if mentioned
4. Add brief descriptions from the video
5. Show progression clearly
6. Use proper Mermaid timeline syntax
7. IMPORTANT: Avoid using pipe characters (|) in labels. Use alternative notations like "magnitude of" or "norm".

IMPORTANT: Generate your response in the following JSON format:
{
  "title": "A clear, descriptive title for this timeline based on the content",
  "description": "A detailed explanation of the chronological progression shown from the video",
  "mermaidCode": "The actual Mermaid timeline code starting with 'timeline'"
}
`;

    try {
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Mermaid diagram expert. Generate valid Mermaid syntax and provide clear titles and descriptions. Avoid using pipe characters (|) in node labels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800
      });

      const result = JSON.parse(response.trim());
      console.log('📊 Generated timeline with title:', result.title);
      
      // Clean the mermaid code if needed
      let mermaidCode = result.mermaidCode || '';
      if (mermaidCode.startsWith('```')) {
        mermaidCode = mermaidCode.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      
      // Apply sanitization
      mermaidCode = this.sanitizeMermaidCode(mermaidCode);
      
      return {
        type: 'mermaid',
        code: mermaidCode,
        title: result.title || 'Timeline from Video',
        description: result.description || 'Chronological progression based on the video',
        interactionHints: [
          'Read from left to right',
          'Note the progression over time'
        ]
      };
    } catch (error) {
      console.error('❌ Error generating timeline:', error);
      // Fallback approach
      const mermaidCode = await this.generateMermaidWithLLM(
        prompt.split('IMPORTANT:')[0] + 'Return ONLY valid Mermaid code starting with "timeline". Avoid using pipe characters (|) in node labels.'
      );
      
      return {
        type: 'mermaid',
        code: this.sanitizeMermaidCode(mermaidCode),
        title: `Timeline from Video`,
        description: `Chronological progression based on the video`,
        interactionHints: [
          'Read from left to right',
          'Note the progression over time'
        ]
      };
    }
  }

  private async generateAutomatic(context: VisualGenerationContext, transcriptContext: string): Promise<VisualContent> {
    // Let the LLM decide the best visualization type
    const prompt = `
Based on the following video transcript and the user's request, choose the best Mermaid diagram type and generate it.

VIDEO TRANSCRIPT:
${transcriptContext}

USER'S QUESTION/CONTEXT:
${context.topic}

Select from: flowchart, mindmap, sequence diagram, comparison graph, or timeline.
Generate the most appropriate visualization based on the actual content discussed in the video.

IMPORTANT: 
1. Avoid using pipe characters (|) in any labels. Use alternative notations like "magnitude of" or "norm".
2. Generate your response in the following JSON format:
{
  "title": "A clear, descriptive title for this diagram based on the content",
  "description": "A detailed explanation of what this diagram shows and how it helps understand the video content",
  "diagramType": "The type of diagram chosen (flowchart, mindmap, sequence, comparison, or timeline)",
  "mermaidCode": "The actual Mermaid diagram code"
}
`;

    try {
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Mermaid diagram expert. Generate valid Mermaid syntax and provide clear titles and descriptions. Avoid using pipe characters (|) in node labels.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800
      });

      const result = JSON.parse(response.trim());
      console.log('📊 Generated automatic diagram with title:', result.title);
      console.log('  Chosen diagram type:', result.diagramType);
      
      // Clean the mermaid code if needed
      let mermaidCode = result.mermaidCode || '';
      if (mermaidCode.startsWith('```')) {
        mermaidCode = mermaidCode.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }
      
      // Apply sanitization
      mermaidCode = this.sanitizeMermaidCode(mermaidCode);
      
      return {
        type: 'mermaid',
        code: mermaidCode,
        title: result.title || 'Video Content Visualization',
        description: result.description || 'AI-selected visualization based on the video',
        interactionHints: this.getInteractionHints(result.diagramType || 'flowchart')
      };
    } catch (error) {
      console.error('❌ Error generating automatic diagram:', error);
      // Fallback approach
      const mermaidCode = await this.generateMermaidWithLLM(
        prompt.split('IMPORTANT:')[0] + 'Return ONLY valid Mermaid code. Avoid using pipe characters (|) in node labels.'
      );
      
      return {
        type: 'mermaid',
        code: this.sanitizeMermaidCode(mermaidCode),
        title: `Video Content Visualization`,
        description: `AI-selected visualization based on the video`,
        interactionHints: ['Explore the diagram to understand the video content better']
      };
    }
  }

  private async generateMermaidWithLLM(prompt: string): Promise<string> {
    try {
      console.log('📝 Generating Mermaid diagram with OpenAI...');
      
      const response = await this.makeOpenAIRequest({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Mermaid diagram expert. Generate only valid Mermaid syntax code. No explanations, no markdown code blocks, just the pure Mermaid diagram code. IMPORTANT: Avoid using pipe characters (|) in node labels - use "magnitude of" or "norm" instead of |V| notation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      let code = response.trim();
      console.log('📊 Generated Mermaid code:', code.substring(0, 100) + '...');
      
      // Strip markdown code blocks if present
      if (code.startsWith('```')) {
        // Remove opening ```mermaid or just ```
        code = code.replace(/^```(?:mermaid)?\s*\n?/, '');
        // Remove closing ```
        code = code.replace(/\n?```\s*$/, '');
        code = code.trim();
        console.log('📋 Stripped markdown wrapper, clean code:', code.substring(0, 100) + '...');
      }
      
      // Apply sanitization to handle any special characters
      code = this.sanitizeMermaidCode(code);
      console.log('🧹 Sanitized Mermaid code:', code.substring(0, 100) + '...');
      
      // Basic validation
      if (!code || !this.isValidMermaidCode(code)) {
        console.error('❌ Invalid Mermaid code generated:', code);
        throw new Error('Invalid Mermaid code generated');
      }

      return code;
    } catch (error) {
      console.error('❌ Error generating Mermaid diagram:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      // Return a fallback diagram
      return this.getFallbackDiagram();
    }
  }

  private async makeOpenAIRequest(body: any): Promise<string> {
    const apiKey = this.apiKey || Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔍 Checking API key availability...');
    console.log('  - Constructor API key:', this.apiKey ? 'Present' : 'Not present');
    console.log('  - Environment API key:', Deno.env.get('OPENAI_API_KEY') ? 'Present' : 'Not present');
    
    if (!apiKey) {
      console.error('❌ No OpenAI API key available');
      console.error('  - this.apiKey:', this.apiKey);
      console.error('  - Deno.env.get("OPENAI_API_KEY"):', Deno.env.get('OPENAI_API_KEY'));
      throw new Error('OpenAI API key not configured');
    }

    console.log('🔑 Using OpenAI API key:', apiKey.substring(0, 10) + '...');
    console.log('📤 Request body:', JSON.stringify(body, null, 2));

    try {
      // Use LangSmith logging for OpenAI calls
      const response = await logOpenAICall(
        'https://api.openai.com/v1/chat/completions',
        body,
        `Visual Generation - ${body.model || 'gpt-4o-mini'}`,
        apiKey
      );

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      const content = data.choices[0]?.message?.content || '';
      console.log('📊 Response content:', content.substring(0, 100) + '...');
      return content;
    } catch (error) {
      console.error('❌ Error in makeOpenAIRequest:', error);
      throw error;
    }
  }

  private isValidMermaidCode(code: string): boolean {
    const validStarters = [
      'graph ', 'flowchart ', 'sequenceDiagram', 'classDiagram',
      'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie',
      'mindmap', 'timeline', 'gitGraph'
    ];
    
    return validStarters.some(starter => code.trim().startsWith(starter));
  }

  private getFallbackDiagram(): string {
    return `graph TD
    A[Unable to generate specific diagram]
    B[Please try rephrasing your question]
    C[Or ask for a specific diagram type]
    A --> B
    A --> C`;
  }

  private getInteractionHints(diagramType: string): string[] {
    const hints: { [key: string]: string[] } = {
      flowchart: [
        'Follow the arrows to understand the flow',
        'Decision points show different paths'
      ],
      mindmap: [
        'Explore from center outward',
        'Each branch represents a related concept'
      ],
      sequence: [
        'Read from top to bottom',
        'Arrows show the flow of events'
      ],
      comparison: [
        'Compare features side by side',
        'Notice the connections between concepts'
      ],
      timeline: [
        'Read from left to right',
        'Note the progression over time'
      ]
    };
    
    return hints[diagramType] || ['Explore the diagram to understand the video content better'];
  }

  extractVisualContext(context: EdgeFunctionContext): VisualGenerationContext {
    const transcripts = context.courseContext.playedTranscriptSegments;
    const message = context.message;
    
    // Simple context extraction - let the LLM handle the complex understanding
    const topic = message || 'the video content discussed so far';
    
    console.log('📊 Visual context:', { 
      topic,
      transcriptSegments: transcripts.length,
      message: message 
    });
    
    return {
      topic,
      concepts: [], // Not using heuristic extraction anymore
      relationships: [],
      complexity: transcripts.length > 50 ? 'complex' : transcripts.length > 20 ? 'moderate' : 'simple',
      learningObjective: `Understanding the content from the video`
    };
  }

  private extractTopicFromTranscript(segments: TranscriptSegment[]): string {
    // Simplified - just return a generic description
    if (segments.length === 0) return 'the current topic';
    return 'the video content';
  }

  private extractConceptsFromTranscript(segments: TranscriptSegment[]): string[] {
    // Not using heuristic extraction anymore
    return [];
  }

  /**
   * Sanitizes Mermaid code to escape special characters that cause parsing errors
   */
  private sanitizeMermaidCode(code: string): string {
    // Replace pipe characters in node labels with Unicode alternatives
    // This regex looks for content within square brackets and replaces pipes
    let sanitized = code.replace(/\[([^\]]*)\]/g, (match, content) => {
      // Replace pipe characters with a Unicode full-width vertical bar
      const sanitizedContent = content.replace(/\|/g, '｜');
      return `[${sanitizedContent}]`;
    });
    
    // Also handle pipes in quoted strings
    sanitized = sanitized.replace(/"([^"]*)"/g, (match, content) => {
      const sanitizedContent = content.replace(/\|/g, '｜');
      return `"${sanitizedContent}"`;
    });
    
    // Handle other potentially problematic characters
    // Replace angle brackets that might conflict with Mermaid syntax
    sanitized = sanitized.replace(/\[([^\]]*)\]/g, (match, content) => {
      let cleaned = content;
      // Replace < and > with Unicode alternatives if not part of HTML entities
      cleaned = cleaned.replace(/(?<!&\w{2,6})<(?!\/?\w+>)/g, '＜');
      cleaned = cleaned.replace(/(?<!<\/?\w+)>(?!\w{2,6};)/g, '＞');
      return `[${cleaned}]`;
    });
    
    return sanitized;
  }
} 