/**
 * Canvas Export Orchestration Service
 * 
 * This service orchestrates the complete Canvas export process, connecting
 * the UI components with the Canvas API and data transformation services.
 * Handles error recovery, progress tracking, and real-time updates.
 */

import { CanvasAPI, CanvasConfig, CanvasCourse, CanvasModule, CanvasQuiz, CanvasPage } from './canvas-api';
import { CanvasTransformer, CanvasExportOptions, Course, Segment, Question } from './canvas-transformer';

export interface CanvasExportProgress {
  id: string;
  courseId: string;
  canvasCourseId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

export interface CanvasExportResult {
  success: boolean;
  canvasCourseId?: string;
  canvasCourseUrl?: string;
  modulesCreated: number;
  quizzesCreated: number;
  pagesCreated: number;
  error?: string;
  warnings?: string[];
}

export interface ExportStep {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number; // in seconds
}

const EXPORT_STEPS: ExportStep[] = [
  {
    id: 'validation',
    name: 'Validating Course Data',
    description: 'Checking course content and Canvas compatibility',
    estimatedDuration: 5,
  },
  {
    id: 'canvas_connection',
    name: 'Connecting to Canvas',
    description: 'Establishing connection to Canvas LMS',
    estimatedDuration: 3,
  },
  {
    id: 'course_creation',
    name: 'Creating Canvas Course',
    description: 'Setting up course structure and metadata',
    estimatedDuration: 10,
  },
  {
    id: 'modules_creation',
    name: 'Creating Modules',
    description: 'Organizing content into Canvas modules',
    estimatedDuration: 15,
  },
  {
    id: 'content_pages',
    name: 'Creating Content Pages',
    description: 'Setting up video and learning content',
    estimatedDuration: 20,
  },
  {
    id: 'quizzes_export',
    name: 'Exporting Quizzes',
    description: 'Creating interactive assessments',
    estimatedDuration: 30,
  },
  {
    id: 'quiz_questions',
    name: 'Adding Quiz Questions',
    description: 'Importing questions and answers',
    estimatedDuration: 25,
  },
  {
    id: 'module_items',
    name: 'Linking Module Items',
    description: 'Connecting content to modules',
    estimatedDuration: 15,
  },
  {
    id: 'publishing',
    name: 'Publishing Course',
    description: 'Making course available to students',
    estimatedDuration: 5,
  },
  {
    id: 'finalization',
    name: 'Finalizing Export',
    description: 'Completing export process',
    estimatedDuration: 2,
  },
];

export class CanvasExporter {
  private canvasAPI: CanvasAPI;
  private progressCallbacks: Array<(progress: CanvasExportProgress) => void> = [];
  private currentExport: CanvasExportProgress | null = null;

  constructor(config: CanvasConfig) {
    this.canvasAPI = new CanvasAPI(config);
  }

  /**
   * Subscribe to export progress updates
   */
  onProgress(callback: (progress: CanvasExportProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update export progress and notify subscribers
   */
  private updateProgress(updates: Partial<CanvasExportProgress>): void {
    if (!this.currentExport) return;

    this.currentExport = {
      ...this.currentExport,
      ...updates,
    };

    // Calculate estimated time remaining
    if (this.currentExport.status === 'in_progress') {
      const totalEstimatedTime = EXPORT_STEPS.reduce((acc, step) => acc + step.estimatedDuration, 0);
      const completedTime = EXPORT_STEPS.slice(0, this.currentExport.completedSteps)
        .reduce((acc, step) => acc + step.estimatedDuration, 0);
      
      this.currentExport.estimatedTimeRemaining = totalEstimatedTime - completedTime;
    }

    this.progressCallbacks.forEach(callback => {
      try {
        callback(this.currentExport!);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Execute the complete Canvas export process
   */
  async exportCourse(
    course: Course,
    segments: Segment[],
    options: CanvasExportOptions
  ): Promise<CanvasExportResult> {
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentExport = {
      id: exportId,
      courseId: course.id,
      status: 'in_progress',
      currentStep: 'Starting export...',
      totalSteps: EXPORT_STEPS.length,
      completedSteps: 0,
      startedAt: new Date(),
    };

    this.updateProgress({});

    try {
      // Step 1: Validation
      await this.executeStep('validation', async () => {
        const validation = CanvasTransformer.validateCourse(course, segments);
        if (!validation.isValid) {
          throw new Error(`Course validation failed: ${validation.errors.join(', ')}`);
        }
        return { warnings: validation.warnings };
      });

      // Step 2: Canvas Connection
      await this.executeStep('canvas_connection', async () => {
        await this.canvasAPI.testConnection();
      });

      // Step 3: Course Creation
      const canvasCourse = await this.executeStep('course_creation', async () => {
        const transformedData = CanvasTransformer.transformCourse(course, segments, options);
        
        let canvasCourse: CanvasCourse;
        if (options.courseId) {
          // Update existing course
          canvasCourse = await this.canvasAPI.updateCourse(options.courseId, transformedData.course);
        } else {
          // Create new course
          canvasCourse = await this.canvasAPI.createCourse({
            name: transformedData.course.name!,
            course_code: transformedData.course.course_code!,
            description: transformedData.course.public_description,
            is_public: transformedData.course.is_public,
            syllabus_body: transformedData.course.syllabus_body,
          });
        }

        this.updateProgress({ canvasCourseId: canvasCourse.id.toString() });
        return canvasCourse;
      });

      // Step 4: Modules Creation
      const canvasModules = await this.executeStep('modules_creation', async () => {
        const transformedData = CanvasTransformer.transformCourse(course, segments, options);
        const modules: CanvasModule[] = [];

        for (const moduleData of transformedData.modules) {
          const canvasModule = await this.canvasAPI.createModule(canvasCourse.id.toString(), {
            name: moduleData.module.name!,
            position: moduleData.module.position,
            require_sequential_progress: moduleData.module.require_sequential_progress,
          });
          modules.push(canvasModule);
        }

        return modules;
      });

      // Step 5: Content Pages
      const canvasPages = await this.executeStep('content_pages', async () => {
        const transformedData = CanvasTransformer.transformCourse(course, segments, options);
        const pages: CanvasPage[] = [];

        for (const pageData of transformedData.pages) {
          const canvasPage = await this.canvasAPI.createPage(canvasCourse.id.toString(), {
            title: pageData.title!,
            body: pageData.body!,
            editing_roles: pageData.editing_roles || 'teachers',
            published: false,
          });
          pages.push(canvasPage);
        }

        return pages;
      });

      // Step 6: Quizzes Export
      const canvasQuizzes = await this.executeStep('quizzes_export', async () => {
        if (!options.includeQuizzes) return [];

        const transformedData = CanvasTransformer.transformCourse(course, segments, options);
        const quizzes: CanvasQuiz[] = [];

        for (const quizData of transformedData.quizzes) {
          const canvasQuiz = await this.canvasAPI.createQuiz(canvasCourse.id.toString(), {
            title: quizData.title!,
            description: quizData.description,
            quiz_type: quizData.quiz_type,
            points_possible: quizData.points_possible,
            allowed_attempts: quizData.allowed_attempts,
            show_correct_answers: quizData.show_correct_answers,
            shuffle_answers: quizData.shuffle_answers,
            one_question_at_a_time: quizData.one_question_at_a_time,
            cant_go_back: quizData.cant_go_back,
            time_limit: quizData.time_limit,
          });
          quizzes.push(canvasQuiz);
        }

        return quizzes;
      });

      // Step 7: Quiz Questions
      await this.executeStep('quiz_questions', async () => {
        if (!options.includeQuizzes || canvasQuizzes.length === 0) return;

        let questionPosition = 1;

        if (options.moduleStructure === 'segments') {
          // Add questions for each segment
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const quiz = canvasQuizzes[i];
            
            if (quiz && segment.questions.length > 0) {
              for (const question of segment.questions) {
                const transformedQuestion = CanvasTransformer.transformQuestion(question, questionPosition++);
                await this.canvasAPI.createQuizQuestion(
                  canvasCourse.id.toString(),
                  quiz.id,
                  transformedQuestion
                );
              }
            }
          }
        } else {
          // Add all questions to single quiz
          const quiz = canvasQuizzes[0];
          if (quiz) {
            const allQuestions = segments.flatMap(s => s.questions);
            for (const question of allQuestions) {
              const transformedQuestion = CanvasTransformer.transformQuestion(question, questionPosition++);
              await this.canvasAPI.createQuizQuestion(
                canvasCourse.id.toString(),
                quiz.id,
                transformedQuestion
              );
            }
          }
        }
      });

      // Step 8: Module Items
      await this.executeStep('module_items', async () => {
        const transformedData = CanvasTransformer.transformCourse(course, segments, options);

        for (let i = 0; i < canvasModules.length; i++) {
          const module = canvasModules[i];
          const moduleData = transformedData.modules[i];

          for (const item of moduleData.items) {
            let contentId: number | undefined;

            // Find the content ID based on item type
            if (item.type === 'Page' && canvasPages.length > 0) {
              const page = canvasPages.find(p => p.url === item.page_url);
              contentId = page ? parseInt(page.url) : undefined; // Canvas uses URL for pages
            } else if (item.type === 'Quiz') {
              const quizIndex = options.moduleStructure === 'segments' ? i : 0;
              const quiz = canvasQuizzes[quizIndex];
              contentId = quiz ? quiz.id : undefined;
            }

            await this.canvasAPI.createModuleItem(canvasCourse.id.toString(), module.id, {
              title: item.title,
              type: item.type,
              content_id: contentId,
              page_url: item.page_url,
              position: item.position,
              completion_requirement: item.completion_requirement,
            });
          }
        }
      });

      // Step 9: Publishing
      await this.executeStep('publishing', async () => {
        if (options.publishImmediately) {
          await this.canvasAPI.publishCourse(canvasCourse.id.toString());
          
          // Publish quizzes if requested
          for (const quiz of canvasQuizzes) {
            await this.canvasAPI.publishQuiz(canvasCourse.id.toString(), quiz.id);
          }
        }
      });

      // Step 10: Finalization
      await this.executeStep('finalization', async () => {
        // Any cleanup or final steps
        return { completed: true };
      });

      const result: CanvasExportResult = {
        success: true,
        canvasCourseId: canvasCourse.id.toString(),
        canvasCourseUrl: `${this.canvasAPI['config'].canvasUrl}/courses/${canvasCourse.id}`,
        modulesCreated: canvasModules.length,
        quizzesCreated: canvasQuizzes.length,
        pagesCreated: canvasPages.length,
      };

      this.updateProgress({
        status: 'completed',
        completedAt: new Date(),
        estimatedTimeRemaining: 0,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.updateProgress({
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      });

      return {
        success: false,
        error: errorMessage,
        modulesCreated: 0,
        quizzesCreated: 0,
        pagesCreated: 0,
      };
    }
  }

  /**
   * Execute a single export step with progress tracking
   */
  private async executeStep<T>(
    stepId: string,
    execution: () => Promise<T>
  ): Promise<T> {
    const step = EXPORT_STEPS.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Unknown export step: ${stepId}`);
    }

    this.updateProgress({
      currentStep: step.name,
    });

    try {
      const result = await execution();
      
      this.updateProgress({
        completedSteps: this.currentExport!.completedSteps + 1,
      });

      return result;
    } catch (error) {
      throw new Error(`Failed at step "${step.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current export progress
   */
  getCurrentProgress(): CanvasExportProgress | null {
    return this.currentExport;
  }

  /**
   * Cancel current export (if possible)
   */
  async cancelExport(): Promise<void> {
    if (this.currentExport && this.currentExport.status === 'in_progress') {
      this.updateProgress({
        status: 'failed',
        error: 'Export cancelled by user',
        completedAt: new Date(),
      });
    }
  }

  /**
   * Validate Canvas connection before export
   */
  async validateConnection(): Promise<{ valid: boolean; error?: string; userInfo?: any }> {
    try {
      const userInfo = await this.canvasAPI.testConnection();
      return { valid: true, userInfo };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get available Canvas accounts
   */
  async getAvailableAccounts(): Promise<any[]> {
    return this.canvasAPI.getAccounts();
  }

  /**
   * Get courses for a specific account
   */
  async getAccountCourses(accountId?: string): Promise<any[]> {
    return this.canvasAPI.getCoursesByAccount(accountId);
  }
}

/**
 * Utility function to create a new exporter instance
 */
export function createCanvasExporter(config: CanvasConfig): CanvasExporter {
  return new CanvasExporter(config);
}

/**
 * Utility function to estimate export duration
 */
export function estimateExportDuration(
  course: Course,
  segments: Segment[],
  options: CanvasExportOptions
): number {
  let totalTime = EXPORT_STEPS.reduce((acc, step) => acc + step.estimatedDuration, 0);

  // Adjust based on content size
  const questionCount = segments.reduce((acc, seg) => acc + seg.questions.length, 0);
  const additionalQuestionTime = Math.max(0, (questionCount - 10) * 2); // 2 seconds per question over 10

  const moduleCount = options.moduleStructure === 'segments' ? segments.length : 1;
  const additionalModuleTime = Math.max(0, (moduleCount - 1) * 5); // 5 seconds per additional module

  return totalTime + additionalQuestionTime + additionalModuleTime;
}