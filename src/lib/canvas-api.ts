/**
 * Canvas LMS API Integration Service
 * 
 * This service provides a TypeScript interface for interacting with Canvas LMS APIs
 * to export CourseForge AI courses to Canvas instances.
 * 
 * Features:
 * - Course creation and management
 * - Module and content organization
 * - Quiz and assignment export
 * - Progress tracking and analytics
 * - Rate limiting and error handling
 */

// Canvas API Types
export interface CanvasConfig {
  canvasUrl: string;        // e.g., "https://institution.instructure.com"
  accessToken: string;      // Canvas API token
  accountId?: string;       // Canvas account ID (optional)
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
  account_id: number;
  start_at?: string;
  end_at?: string;
  public_description?: string;
  is_public: boolean;
  syllabus_body?: string;
  storage_quota_mb: number;
  hide_final_grades: boolean;
  apply_assignment_group_weights: boolean;
  calendar?: any;
  time_zone: string;
  blueprint: boolean;
  sis_course_id?: string;
  integration_id?: string;
}

export interface CanvasModule {
  id: number;
  workflow_state: string;
  position: number;
  name: string;
  unlock_at?: string;
  require_sequential_progress: boolean;
  publish_final_grade: boolean;
  prerequisite_module_ids: number[];
  state: string;
  completed_at?: string;
  items_count: number;
  items_url: string;
}

export interface CanvasModuleItem {
  id: number;
  module_id: number;
  position: number;
  title: string;
  indent: number;
  type: 'File' | 'Page' | 'Discussion' | 'Assignment' | 'Quiz' | 'SubHeader' | 'ExternalUrl' | 'ExternalTool';
  content_id: number;
  html_url: string;
  url?: string;
  page_url?: string;
  external_url?: string;
  new_tab: boolean;
  completion_requirement?: {
    type: 'must_view' | 'must_contribute' | 'must_submit' | 'must_mark_done';
    completed: boolean;
  };
}

export interface CanvasQuiz {
  id: number;
  title: string;
  html_url: string;
  mobile_url: string;
  preview_url: string;
  description: string;
  quiz_type: 'practice_quiz' | 'assignment' | 'graded_survey' | 'survey';
  assignment_group_id?: number;
  time_limit?: number;
  shuffle_answers: boolean;
  hide_results?: 'always' | 'until_after_last_attempt' | null;
  show_correct_answers: boolean;
  show_correct_answers_last_attempt: boolean;
  show_correct_answers_at?: string;
  hide_correct_answers_at?: string;
  one_time_results: boolean;
  scoring_policy: 'keep_highest' | 'keep_latest';
  allowed_attempts: number;
  one_question_at_a_time: boolean;
  question_count: number;
  points_possible: number;
  cant_go_back: boolean;
  access_code?: string;
  ip_filter?: string;
  due_at?: string;
  lock_at?: string;
  unlock_at?: string;
  published: boolean;
  unpublishable: boolean;
  locked_for_user: boolean;
  lock_info?: any;
  lock_explanation?: string;
  speedgrader_url?: string;
  quiz_extensions_url?: string;
  permissions: {
    read: boolean;
    submit: boolean;
    create: boolean;
    manage: boolean;
    read_statistics: boolean;
    review_grades: boolean;
    update: boolean;
  };
  all_dates: any[];
  version_number: number;
  question_types: string[];
}

export interface CanvasQuizQuestion {
  id?: number;
  quiz_id?: number;
  position?: number;
  question_name: string;
  question_type: 'multiple_choice_question' | 'true_false_question' | 'short_answer_question' | 'fill_in_multiple_blanks_question' | 'multiple_answers_question' | 'multiple_dropdowns_question' | 'matching_question' | 'numerical_question' | 'calculated_question' | 'essay_question' | 'text_only_question';
  question_text: string;
  points_possible: number;
  correct_comments?: string;
  incorrect_comments?: string;
  neutral_comments?: string;
  answers?: CanvasQuizAnswer[];
  matching_answer_incorrect_matches?: string[];
}

export interface CanvasQuizAnswer {
  id?: number;
  answer_text: string;
  answer_weight: number;
  answer_comments?: string;
  text_after_answers?: string;
  answer_match_left?: string;
  answer_match_right?: string;
  matching_answer_incorrect_matches?: string[];
  numerical_answer_type?: 'exact_answer' | 'range_answer';
  exact?: number;
  margin?: number;
  approximate?: number;
  precision?: number;
}

export interface CanvasPage {
  url: string;
  title: string;
  created_at: string;
  updated_at: string;
  hide_from_students: boolean;
  editing_roles: string;
  last_edited_by: any;
  body: string;
  published: boolean;
  front_page: boolean;
  locked_for_user: boolean;
  lock_info?: any;
  lock_explanation?: string;
}

export interface CanvasFile {
  id: number;
  uuid: string;
  folder_id: number;
  display_name: string;
  filename: string;
  content_type: string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
  unlock_at?: string;
  locked: boolean;
  hidden: boolean;
  lock_at?: string;
  hidden_for_user: boolean;
  thumbnail_url?: string;
  modified_at: string;
  mime_class: string;
  media_entry_id?: string;
  locked_for_user: boolean;
  lock_info?: any;
  lock_explanation?: string;
  preview_url?: string;
}

// Rate Limiting
class CanvasRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequestsPerHour = 3000; // Canvas API limit
  
  async canMakeRequest(canvasUrl: string): Promise<boolean> {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    if (!this.requests.has(canvasUrl)) {
      this.requests.set(canvasUrl, []);
    }
    
    const urlRequests = this.requests.get(canvasUrl)!;
    
    // Remove requests older than 1 hour
    const recentRequests = urlRequests.filter(time => time > hourAgo);
    this.requests.set(canvasUrl, recentRequests);
    
    return recentRequests.length < this.maxRequestsPerHour;
  }
  
  recordRequest(canvasUrl: string): void {
    if (!this.requests.has(canvasUrl)) {
      this.requests.set(canvasUrl, []);
    }
    this.requests.get(canvasUrl)!.push(Date.now());
  }
  
  async waitForRateLimit(canvasUrl: string): Promise<void> {
    while (!(await this.canMakeRequest(canvasUrl))) {
      // Wait 1 minute before checking again
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

// Main Canvas API Service
export class CanvasAPI {
  private rateLimiter = new CanvasRateLimiter();
  
  constructor(private config: CanvasConfig) {
    if (!config.canvasUrl || !config.accessToken) {
      throw new Error('Canvas URL and access token are required');
    }
    
    // Ensure Canvas URL ends without trailing slash
    this.config.canvasUrl = config.canvasUrl.replace(/\/$/, '');
  }
  
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    await this.rateLimiter.waitForRateLimit(this.config.canvasUrl);
    
    const url = `${this.config.canvasUrl}/api/v1${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    this.rateLimiter.recordRequest(this.config.canvasUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Canvas API Error (${response.status}): ${errorText}`);
    }
    
    return response.json();
  }
  
  // Test Canvas connection and get user info
  async testConnection(): Promise<any> {
    return this.makeRequest('/users/self');
  }
  
  // Get available accounts
  async getAccounts(): Promise<any[]> {
    return this.makeRequest('/accounts');
  }
  
  // Course Management
  async createCourse(courseData: {
    name: string;
    course_code: string;
    description?: string;
    is_public?: boolean;
    syllabus_body?: string;
    start_at?: string;
    end_at?: string;
  }): Promise<CanvasCourse> {
    const accountId = this.config.accountId || '1'; // Default to root account
    
    return this.makeRequest(`/accounts/${accountId}/courses`, {
      method: 'POST',
      body: JSON.stringify({
        course: {
          workflow_state: 'unpublished',
          ...courseData,
        }
      }),
    });
  }
  
  async getCourse(courseId: string): Promise<CanvasCourse> {
    return this.makeRequest(`/courses/${courseId}`);
  }
  
  async updateCourse(courseId: string, updates: Partial<CanvasCourse>): Promise<CanvasCourse> {
    return this.makeRequest(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify({ course: updates }),
    });
  }
  
  async publishCourse(courseId: string): Promise<CanvasCourse> {
    return this.updateCourse(courseId, { workflow_state: 'available' });
  }
  
  // Module Management
  async createModule(courseId: string, moduleData: {
    name: string;
    position?: number;
    require_sequential_progress?: boolean;
    prerequisite_module_ids?: number[];
  }): Promise<CanvasModule> {
    return this.makeRequest(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify({
        module: {
          workflow_state: 'active',
          ...moduleData,
        }
      }),
    });
  }
  
  async getModules(courseId: string): Promise<CanvasModule[]> {
    return this.makeRequest(`/courses/${courseId}/modules`);
  }
  
  async updateModule(courseId: string, moduleId: number, updates: Partial<CanvasModule>): Promise<CanvasModule> {
    return this.makeRequest(`/courses/${courseId}/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify({ module: updates }),
    });
  }
  
  // Module Items
  async createModuleItem(courseId: string, moduleId: number, itemData: {
    title: string;
    type: CanvasModuleItem['type'];
    content_id?: number;
    page_url?: string;
    external_url?: string;
    position?: number;
    indent?: number;
    new_tab?: boolean;
    completion_requirement?: CanvasModuleItem['completion_requirement'];
  }): Promise<CanvasModuleItem> {
    return this.makeRequest(`/courses/${courseId}/modules/${moduleId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        module_item: itemData,
      }),
    });
  }
  
  // Page Management
  async createPage(courseId: string, pageData: {
    title: string;
    body: string;
    editing_roles?: string;
    notify_of_update?: boolean;
    published?: boolean;
    front_page?: boolean;
  }): Promise<CanvasPage> {
    return this.makeRequest(`/courses/${courseId}/pages`, {
      method: 'POST',
      body: JSON.stringify({
        wiki_page: {
          published: false,
          ...pageData,
        }
      }),
    });
  }
  
  async getPage(courseId: string, pageUrl: string): Promise<CanvasPage> {
    return this.makeRequest(`/courses/${courseId}/pages/${pageUrl}`);
  }
  
  async updatePage(courseId: string, pageUrl: string, updates: Partial<CanvasPage>): Promise<CanvasPage> {
    return this.makeRequest(`/courses/${courseId}/pages/${pageUrl}`, {
      method: 'PUT',
      body: JSON.stringify({ wiki_page: updates }),
    });
  }
  
  // Quiz Management
  async createQuiz(courseId: string, quizData: {
    title: string;
    description?: string;
    quiz_type?: CanvasQuiz['quiz_type'];
    points_possible?: number;
    allowed_attempts?: number;
    time_limit?: number;
    shuffle_answers?: boolean;
    show_correct_answers?: boolean;
    one_question_at_a_time?: boolean;
    cant_go_back?: boolean;
    due_at?: string;
    unlock_at?: string;
    lock_at?: string;
  }): Promise<CanvasQuiz> {
    return this.makeRequest(`/courses/${courseId}/quizzes`, {
      method: 'POST',
      body: JSON.stringify({
        quiz: {
          published: false,
          quiz_type: 'assignment',
          ...quizData,
        }
      }),
    });
  }
  
  async getQuiz(courseId: string, quizId: number): Promise<CanvasQuiz> {
    return this.makeRequest(`/courses/${courseId}/quizzes/${quizId}`);
  }
  
  async updateQuiz(courseId: string, quizId: number, updates: Partial<CanvasQuiz>): Promise<CanvasQuiz> {
    return this.makeRequest(`/courses/${courseId}/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify({ quiz: updates }),
    });
  }
  
  async publishQuiz(courseId: string, quizId: number): Promise<CanvasQuiz> {
    return this.updateQuiz(courseId, quizId, { published: true });
  }
  
  // Quiz Questions
  async createQuizQuestion(courseId: string, quizId: number, questionData: CanvasQuizQuestion): Promise<CanvasQuizQuestion> {
    return this.makeRequest(`/courses/${courseId}/quizzes/${quizId}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        question: questionData,
      }),
    });
  }
  
  async getQuizQuestions(courseId: string, quizId: number): Promise<CanvasQuizQuestion[]> {
    return this.makeRequest(`/courses/${courseId}/quizzes/${quizId}/questions`);
  }
  
  async updateQuizQuestion(courseId: string, quizId: number, questionId: number, updates: Partial<CanvasQuizQuestion>): Promise<CanvasQuizQuestion> {
    return this.makeRequest(`/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify({ question: updates }),
    });
  }
  
  // File Management
  async uploadFile(courseId: string, file: File, folderId?: number): Promise<CanvasFile> {
    // Step 1: Get upload URL and parameters
    const uploadInfo = await this.makeRequest<any>(`/courses/${courseId}/files`, {
      method: 'POST',
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        content_type: file.type,
        parent_folder_id: folderId,
      }),
    });
    
    // Step 2: Upload file to Canvas
    const formData = new FormData();
    Object.entries(uploadInfo.upload_params).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append('file', file);
    
    const uploadResponse = await fetch(uploadInfo.upload_url, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.statusText}`);
    }
    
    // Step 3: Confirm upload
    const confirmResponse = await fetch(uploadResponse.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });
    
    return confirmResponse.json();
  }
  
  // Utility Methods
  async validateApiToken(): Promise<boolean> {
    try {
      await this.testConnection();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async getCoursesByAccount(accountId?: string): Promise<CanvasCourse[]> {
    const account = accountId || this.config.accountId || '1';
    return this.makeRequest(`/accounts/${account}/courses`);
  }
}