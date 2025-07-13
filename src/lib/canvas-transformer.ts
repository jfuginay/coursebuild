/**
 * Canvas Data Transformation Service
 * 
 * Transforms CourseForge AI course data into Canvas LMS compatible formats.
 * Handles complex mappings between different question types, video content,
 * and course structures.
 */

import { CanvasCourse, CanvasModule, CanvasQuiz, CanvasQuizQuestion, CanvasQuizAnswer, CanvasPage } from './canvas-api';

// CourseForge Data Types (from existing codebase)
export interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
  averageRating?: number;
  totalRatings?: number;
  topic?: string;
}

export interface Question {
  id: string;
  question: string;
  type: string; // 'multiple-choice', 'true-false', 'hotspot', 'matching', 'sequencing'
  options: string[];
  correct_answer: number;
  explanation: string;
  timestamp: number;
  visual_context?: string;
  frame_timestamp?: number;
  bounding_boxes?: BoundingBox[];
  matching_pairs?: MatchingPair[];
  requires_video_overlay?: boolean;
}

export interface BoundingBox {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_correct_answer: boolean;
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface Segment {
  title: string;
  timestamp: string;
  timestampSeconds: number;
  concepts: string[];
  questions: Question[];
}

export interface VideoTranscript {
  full_transcript: string;
  segments: TranscriptSegment[];
  key_concepts_timeline: ConceptTimelineEntry[];
}

export interface TranscriptSegment {
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
}

export interface ConceptTimelineEntry {
  concept: string;
  timestamp: number;
  description: string;
}

// Canvas Export Configuration
export interface CanvasExportOptions {
  courseId?: string;
  createNewCourse: boolean;
  includeVideos: boolean;
  includeQuizzes: boolean;
  moduleStructure: 'segments' | 'linear' | 'custom';
  publishImmediately: boolean;
  videoIntegration: 'embed' | 'external_tool' | 'link';
  quizSettings: {
    allowMultipleAttempts: boolean;
    showCorrectAnswers: boolean;
    timeLimit?: number;
    shuffleAnswers: boolean;
  };
}

// Question Type Mapping
const QUESTION_TYPE_MAPPING: Record<string, CanvasQuizQuestion['question_type']> = {
  'multiple-choice': 'multiple_choice_question',
  'true-false': 'true_false_question',
  'hotspot': 'essay_question', // Will be enhanced with instructions
  'matching': 'matching_question',
  'sequencing': 'essay_question', // Will be enhanced with instructions
};

export class CanvasTransformer {
  /**
   * Transform CourseForge course to Canvas course format
   */
  static transformCourse(
    course: Course, 
    segments: Segment[], 
    options: CanvasExportOptions
  ): {
    course: Partial<CanvasCourse>;
    modules: Array<{ module: Partial<CanvasModule>; items: any[] }>;
    quizzes: Partial<CanvasQuiz>[];
    pages: Partial<CanvasPage>[];
  } {
    // Transform course metadata
    const canvasCourse: Partial<CanvasCourse> = {
      name: course.title,
      course_code: `CF-${course.id.slice(0, 8).toUpperCase()}`,
      public_description: course.description,
      syllabus_body: this.generateSyllabusBody(course, segments),
      is_public: false,
      workflow_state: options.publishImmediately ? 'available' : 'unpublished',
    };

    // Transform modules based on structure preference
    let modules: Array<{ module: Partial<CanvasModule>; items: any[] }> = [];
    let quizzes: Partial<CanvasQuiz>[] = [];
    let pages: Partial<CanvasPage>[] = [];

    if (options.moduleStructure === 'segments') {
      // Create modules from segments
      modules = segments.map((segment, index) => ({
        module: {
          name: segment.title || `Segment ${index + 1}`,
          position: index + 1,
          require_sequential_progress: true,
        },
        items: this.createModuleItemsForSegment(segment, options),
      }));

      // Create quizzes for each segment
      segments.forEach((segment, index) => {
        if (segment.questions.length > 0 && options.includeQuizzes) {
          quizzes.push(this.transformSegmentToQuiz(segment, index + 1, options));
        }
      });
    } else if (options.moduleStructure === 'linear') {
      // Create single module with linear content
      const allQuestions = segments.flatMap(s => s.questions);
      
      modules = [{
        module: {
          name: course.title,
          position: 1,
          require_sequential_progress: true,
        },
        items: this.createLinearModuleItems(course, segments, options),
      }];

      if (allQuestions.length > 0 && options.includeQuizzes) {
        quizzes.push(this.transformQuestionsToQuiz(allQuestions, course.title, options));
      }
    }

    // Create video content pages
    if (options.includeVideos) {
      pages.push(this.createVideoPage(course, segments, options));
    }

    return {
      course: canvasCourse,
      modules,
      quizzes,
      pages,
    };
  }

  /**
   * Generate syllabus body from course data
   */
  private static generateSyllabusBody(course: Course, segments: Segment[]): string {
    const conceptCount = segments.reduce((acc, seg) => acc + seg.concepts.length, 0);
    const questionCount = segments.reduce((acc, seg) => acc + seg.questions.length, 0);

    return `
<h2>Course Overview</h2>
<p>${course.description}</p>

<h3>Course Statistics</h3>
<ul>
  <li><strong>Video Segments:</strong> ${segments.length}</li>
  <li><strong>Key Concepts:</strong> ${conceptCount}</li>
  <li><strong>Interactive Questions:</strong> ${questionCount}</li>
  <li><strong>Original Video:</strong> <a href="${course.youtube_url}" target="_blank">Watch on YouTube</a></li>
</ul>

<h3>Learning Objectives</h3>
<p>By the end of this course, you will understand:</p>
<ul>
${segments.slice(0, 5).map(seg => 
  seg.concepts.map(concept => `  <li>${concept}</li>`).join('\n')
).join('\n')}
</ul>

<h3>Course Structure</h3>
<ol>
${segments.map((seg, i) => 
  `  <li><strong>${seg.title || `Segment ${i + 1}`}</strong> (${this.formatTimestamp(seg.timestampSeconds)})</li>`
).join('\n')}
</ol>

<p><em>This course was generated using CourseForge AI from educational video content.</em></p>
    `.trim();
  }

  /**
   * Create module items for a segment
   */
  private static createModuleItemsForSegment(segment: Segment, options: CanvasExportOptions): any[] {
    const items: any[] = [];

    // Add video content item
    if (options.includeVideos) {
      items.push({
        title: `Video: ${segment.title}`,
        type: 'Page',
        page_url: `video-${segment.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        position: 1,
        completion_requirement: {
          type: 'must_view',
        },
      });
    }

    // Add quiz item if questions exist
    if (segment.questions.length > 0 && options.includeQuizzes) {
      items.push({
        title: `Quiz: ${segment.title}`,
        type: 'Quiz',
        position: 2,
        completion_requirement: {
          type: 'must_submit',
        },
      });
    }

    return items;
  }

  /**
   * Create linear module items
   */
  private static createLinearModuleItems(
    course: Course, 
    segments: Segment[], 
    options: CanvasExportOptions
  ): any[] {
    const items: any[] = [];
    let position = 1;

    // Add main video page
    if (options.includeVideos) {
      items.push({
        title: `Video: ${course.title}`,
        type: 'Page',
        page_url: `video-${course.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        position: position++,
        completion_requirement: {
          type: 'must_view',
        },
      });
    }

    // Add main quiz
    const totalQuestions = segments.reduce((acc, seg) => acc + seg.questions.length, 0);
    if (totalQuestions > 0 && options.includeQuizzes) {
      items.push({
        title: `Course Quiz: ${course.title}`,
        type: 'Quiz',
        position: position++,
        completion_requirement: {
          type: 'must_submit',
        },
      });
    }

    return items;
  }

  /**
   * Create video content page
   */
  private static createVideoPage(
    course: Course, 
    segments: Segment[], 
    options: CanvasExportOptions
  ): Partial<CanvasPage> {
    const videoId = this.extractYouTubeVideoId(course.youtube_url);
    let body = '';

    switch (options.videoIntegration) {
      case 'embed':
        body = this.createEmbeddedVideoPage(videoId, course, segments);
        break;
      case 'link':
        body = this.createLinkedVideoPage(course.youtube_url, course, segments);
        break;
      case 'external_tool':
        body = this.createExternalToolVideoPage(course.youtube_url, course, segments);
        break;
    }

    return {
      title: `Video: ${course.title}`,
      body,
      published: false,
      editing_roles: 'teachers',
    };
  }

  /**
   * Create embedded video page content
   */
  private static createEmbeddedVideoPage(videoId: string, course: Course, segments: Segment[]): string {
    const segmentsList = segments.map((seg, i) => 
      `<li><strong>${seg.title || `Segment ${i + 1}`}</strong> - ${this.formatTimestamp(seg.timestampSeconds)}</li>`
    ).join('');

    return `
<h2>${course.title}</h2>
<p>${course.description}</p>

<div style="text-align: center; margin: 20px 0;">
  <iframe width="560" height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
  </iframe>
</div>

<h3>Video Segments</h3>
<ol>
${segmentsList}
</ol>

<p><strong>Note:</strong> Interactive questions will appear throughout the video to test your understanding.</p>

<p><a href="${course.youtube_url}" target="_blank">Watch on YouTube →</a></p>
    `.trim();
  }

  /**
   * Create linked video page content
   */
  private static createLinkedVideoPage(youtubeUrl: string, course: Course, segments: Segment[]): string {
    return `
<h2>${course.title}</h2>
<p>${course.description}</p>

<div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #007aff;">
  <h3>📺 Watch the Video</h3>
  <p><a href="${youtubeUrl}" target="_blank" style="font-size: 18px; font-weight: bold;">Open Video on YouTube →</a></p>
  <p><em>The video will open in a new tab. Return here after watching to complete the quiz.</em></p>
</div>

<h3>What You'll Learn</h3>
<ul>
${segments.flatMap(seg => seg.concepts).slice(0, 10).map(concept => `<li>${concept}</li>`).join('')}
</ul>

<h3>Video Timeline</h3>
<ol>
${segments.map((seg, i) => 
  `<li><strong>${seg.title || `Segment ${i + 1}`}</strong> - ${this.formatTimestamp(seg.timestampSeconds)}</li>`
).join('')}
</ol>
    `.trim();
  }

  /**
   * Create external tool video page content
   */
  private static createExternalToolVideoPage(youtubeUrl: string, course: Course, segments: Segment[]): string {
    return `
<h2>${course.title}</h2>
<p>${course.description}</p>

<div class="video-player-container">
  <p><strong>Interactive Video Player</strong></p>
  <p>This video includes interactive elements and timestamped questions.</p>
  <p><a href="${youtubeUrl}" target="_blank">Launch Interactive Player →</a></p>
</div>

<h3>Video Segments</h3>
<ol>
${segments.map((seg, i) => 
  `<li><strong>${seg.title || `Segment ${i + 1}`}</strong> - ${this.formatTimestamp(seg.timestampSeconds)}</li>`
).join('')}
</ol>
    `.trim();
  }

  /**
   * Transform segment to Canvas quiz
   */
  static transformSegmentToQuiz(
    segment: Segment, 
    position: number, 
    options: CanvasExportOptions
  ): Partial<CanvasQuiz> {
    const quiz: Partial<CanvasQuiz> = {
      title: `Quiz: ${segment.title || `Segment ${position}`}`,
      description: `Test your understanding of the concepts covered in ${segment.title || `Segment ${position}`}.`,
      quiz_type: 'assignment',
      points_possible: segment.questions.length * 1, // 1 point per question
      allowed_attempts: options.quizSettings.allowMultipleAttempts ? -1 : 1,
      show_correct_answers: options.quizSettings.showCorrectAnswers,
      shuffle_answers: options.quizSettings.shuffleAnswers,
      one_question_at_a_time: true,
      cant_go_back: false,
      published: false,
    };

    if (options.quizSettings.timeLimit) {
      quiz.time_limit = options.quizSettings.timeLimit;
    }

    return quiz;
  }

  /**
   * Transform questions to Canvas quiz
   */
  static transformQuestionsToQuiz(
    questions: Question[], 
    title: string, 
    options: CanvasExportOptions
  ): Partial<CanvasQuiz> {
    const quiz: Partial<CanvasQuiz> = {
      title: `Quiz: ${title}`,
      description: `Comprehensive quiz covering all concepts in ${title}.`,
      quiz_type: 'assignment',
      points_possible: questions.length * 1,
      allowed_attempts: options.quizSettings.allowMultipleAttempts ? -1 : 1,
      show_correct_answers: options.quizSettings.showCorrectAnswers,
      shuffle_answers: options.quizSettings.shuffleAnswers,
      one_question_at_a_time: true,
      cant_go_back: false,
      published: false,
    };

    if (options.quizSettings.timeLimit) {
      quiz.time_limit = options.quizSettings.timeLimit;
    }

    return quiz;
  }

  /**
   * Transform CourseForge question to Canvas question
   */
  static transformQuestion(question: Question, position: number = 1): CanvasQuizQuestion {
    const baseQuestion: CanvasQuizQuestion = {
      position,
      question_name: `Question ${position}`,
      question_text: this.enhanceQuestionText(question),
      points_possible: 1,
      question_type: QUESTION_TYPE_MAPPING[question.type] || 'multiple_choice_question',
      correct_comments: question.explanation,
    };

    switch (question.type) {
      case 'multiple-choice':
        return this.transformMultipleChoiceQuestion(question, baseQuestion);
      
      case 'true-false':
        return this.transformTrueFalseQuestion(question, baseQuestion);
      
      case 'matching':
        return this.transformMatchingQuestion(question, baseQuestion);
      
      case 'hotspot':
        return this.transformHotspotQuestion(question, baseQuestion);
      
      case 'sequencing':
        return this.transformSequencingQuestion(question, baseQuestion);
      
      default:
        return this.transformMultipleChoiceQuestion(question, baseQuestion);
    }
  }

  /**
   * Enhance question text with context and timing information
   */
  private static enhanceQuestionText(question: Question): string {
    let enhancedText = `<p><strong>${question.question}</strong></p>`;
    
    if (question.timestamp) {
      enhancedText += `<p><em>Video timestamp: ${this.formatTimestamp(question.timestamp)}</em></p>`;
    }
    
    if (question.visual_context) {
      enhancedText += `<p><em>Visual context: ${question.visual_context}</em></p>`;
    }
    
    return enhancedText;
  }

  /**
   * Transform multiple choice question
   */
  private static transformMultipleChoiceQuestion(
    question: Question, 
    base: CanvasQuizQuestion
  ): CanvasQuizQuestion {
    return {
      ...base,
      answers: question.options.map((option, index) => ({
        answer_text: option,
        answer_weight: index === question.correct_answer ? 100 : 0,
        answer_comments: index === question.correct_answer ? question.explanation : '',
      })),
    };
  }

  /**
   * Transform true/false question
   */
  private static transformTrueFalseQuestion(
    question: Question, 
    base: CanvasQuizQuestion
  ): CanvasQuizQuestion {
    return {
      ...base,
      answers: [
        {
          answer_text: 'True',
          answer_weight: question.correct_answer === 1 ? 100 : 0,
        },
        {
          answer_text: 'False',
          answer_weight: question.correct_answer === 0 ? 100 : 0,
        },
      ],
    };
  }

  /**
   * Transform matching question
   */
  private static transformMatchingQuestion(
    question: Question, 
    base: CanvasQuizQuestion
  ): CanvasQuizQuestion {
    if (!question.matching_pairs) {
      // Fallback to multiple choice
      return this.transformMultipleChoiceQuestion(question, base);
    }

    return {
      ...base,
      question_type: 'matching_question',
      answers: question.matching_pairs.map(pair => ({
        answer_match_left: pair.left,
        answer_match_right: pair.right,
        answer_weight: 100,
      })),
    };
  }

  /**
   * Transform hotspot question to essay with instructions
   */
  private static transformHotspotQuestion(
    question: Question, 
    base: CanvasQuizQuestion
  ): CanvasQuizQuestion {
    let instructionText = base.question_text;
    
    if (question.bounding_boxes && question.bounding_boxes.length > 0) {
      instructionText += `<p><strong>Instructions:</strong> This is a hotspot question. `;
      instructionText += `Identify the correct area(s) in the image that correspond to the question.</p>`;
      
      instructionText += `<p><strong>Correct answer(s):</strong></p><ul>`;
      question.bounding_boxes
        .filter(box => box.is_correct_answer)
        .forEach(box => {
          instructionText += `<li>${box.label} (at position ${Math.round(box.x * 100)}%, ${Math.round(box.y * 100)}%)</li>`;
        });
      instructionText += `</ul>`;
    }

    return {
      ...base,
      question_type: 'essay_question',
      question_text: instructionText,
      points_possible: 2, // Essay questions often worth more
    };
  }

  /**
   * Transform sequencing question to essay with instructions
   */
  private static transformSequencingQuestion(
    question: Question, 
    base: CanvasQuizQuestion
  ): CanvasQuizQuestion {
    let instructionText = base.question_text;
    instructionText += `<p><strong>Instructions:</strong> This is a sequencing question. `;
    instructionText += `Arrange the following items in the correct order:</p>`;
    
    instructionText += `<ol>`;
    question.options.forEach(option => {
      instructionText += `<li>${option}</li>`;
    });
    instructionText += `</ol>`;
    
    instructionText += `<p><strong>Correct sequence:</strong></p><ol>`;
    // Assuming correct_answer indicates the correct sequence
    const correctSequence = question.options.slice().sort((a, b) => {
      // This is a simplification - in practice, you'd need the actual sequence data
      return question.options.indexOf(a) - question.options.indexOf(b);
    });
    correctSequence.forEach(item => {
      instructionText += `<li>${item}</li>`;
    });
    instructionText += `</ol>`;

    return {
      ...base,
      question_type: 'essay_question',
      question_text: instructionText,
      points_possible: 2,
    };
  }

  /**
   * Utility: Extract YouTube video ID from URL
   */
  private static extractYouTubeVideoId(url: string): string {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  }

  /**
   * Utility: Format timestamp from seconds
   */
  private static formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Validate transformation compatibility
   */
  static validateCourse(course: Course, segments: Segment[]): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check basic course data
    if (!course.title || course.title.trim().length === 0) {
      errors.push('Course title is required');
    }

    if (!course.youtube_url) {
      errors.push('YouTube URL is required');
    }

    // Check segments
    if (segments.length === 0) {
      warnings.push('Course has no segments - will create single module');
    }

    // Check questions
    const totalQuestions = segments.reduce((acc, seg) => acc + seg.questions.length, 0);
    if (totalQuestions === 0) {
      warnings.push('Course has no questions - quizzes will be empty');
    }

    // Check for unsupported question types
    const supportedTypes = ['multiple-choice', 'true-false', 'matching', 'hotspot', 'sequencing'];
    segments.forEach((segment, segIndex) => {
      segment.questions.forEach((question, qIndex) => {
        if (!supportedTypes.includes(question.type)) {
          warnings.push(`Unsupported question type "${question.type}" in segment ${segIndex + 1}, question ${qIndex + 1}`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }
}