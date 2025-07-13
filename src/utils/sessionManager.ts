/**
 * Session Manager for Anonymous User Tracking
 * Enables enhanced recommendations without requiring login
 */

export interface WrongQuestion {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  type: string;
  timestamp?: number;
  concept?: string;
}

export interface CourseProgress {
  courseId: string;
  title: string;
  youtube_url: string;
  watchedAt: string;
  completionPercentage: number;
  questionsAnswered: number;
  questionsCorrect: number;
}

export interface AnonymousSession {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  currentCourse: {
    id: string;
    title: string;
    youtube_url: string;
    completionPercentage: number;
    startedAt: string;
  } | null;
  performance: {
    totalQuestionsAnswered: number;
    totalQuestionsCorrect: number;
    accuracy: number;
    wrongQuestions: WrongQuestion[];
    questionsByType: {
      [type: string]: {
        answered: number;
        correct: number;
      };
    };
  };
  viewingHistory: CourseProgress[];
}

export interface SessionPerformanceData {
  sessionId: string;
  currentCourse: AnonymousSession['currentCourse'];
  performance: AnonymousSession['performance'];
  recentCourses: CourseProgress[];
}

export class SessionManager {
  private static STORAGE_KEY = 'courseforge_anonymous_session';
  private static SESSION_DURATION_DAYS = 30;

  /**
   * Get current session or null if none exists
   */
  static getSession(): AnonymousSession | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored) as AnonymousSession;
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error retrieving session:', error);
      return null;
    }
  }

  /**
   * Create a new anonymous session
   */
  static createSession(): AnonymousSession {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_DURATION_DAYS);

    const session: AnonymousSession = {
      sessionId: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      currentCourse: null,
      performance: {
        totalQuestionsAnswered: 0,
        totalQuestionsCorrect: 0,
        accuracy: 0,
        wrongQuestions: [],
        questionsByType: {}
      },
      viewingHistory: []
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Get or create session
   */
  static getOrCreateSession(): AnonymousSession {
    return this.getSession() || this.createSession();
  }

  /**
   * Update current course information
   */
  static setCurrentCourse(courseId: string, title: string, youtube_url: string): void {
    const session = this.getOrCreateSession();
    
    session.currentCourse = {
      id: courseId,
      title,
      youtube_url,
      completionPercentage: 0,
      startedAt: new Date().toISOString()
    };

    this.saveSession(session);
  }

  /**
   * Update viewing progress for current course
   */
  static updateViewingProgress(courseId: string, percentage: number): void {
    const session = this.getSession();
    if (!session) return;

    if (session.currentCourse && session.currentCourse.id === courseId) {
      session.currentCourse.completionPercentage = percentage;
    }

    this.saveSession(session);
  }

  /**
   * Track question performance
   */
  static trackQuestionResult(
    question: string,
    userAnswer: string,
    correctAnswer: string,
    isCorrect: boolean,
    type: string,
    timestamp?: number,
    concept?: string
  ): void {
    const session = this.getOrCreateSession();

    // Update totals
    session.performance.totalQuestionsAnswered++;
    if (isCorrect) {
      session.performance.totalQuestionsCorrect++;
    } else {
      // Track wrong question
      session.performance.wrongQuestions.push({
        question,
        userAnswer,
        correctAnswer,
        type,
        timestamp,
        concept
      });

      // Keep only last 50 wrong questions
      if (session.performance.wrongQuestions.length > 50) {
        session.performance.wrongQuestions = session.performance.wrongQuestions.slice(-50);
      }
    }

    // Update question type stats
    if (!session.performance.questionsByType[type]) {
      session.performance.questionsByType[type] = { answered: 0, correct: 0 };
    }
    session.performance.questionsByType[type].answered++;
    if (isCorrect) {
      session.performance.questionsByType[type].correct++;
    }

    // Update accuracy
    session.performance.accuracy = session.performance.totalQuestionsAnswered > 0
      ? (session.performance.totalQuestionsCorrect / session.performance.totalQuestionsAnswered) * 100
      : 0;

    this.saveSession(session);
  }

  /**
   * Complete current course and add to history
   */
  static completeCourse(questionsAnswered: number, questionsCorrect: number): void {
    const session = this.getSession();
    if (!session || !session.currentCourse) return;

    const courseProgress: CourseProgress = {
      courseId: session.currentCourse.id,
      title: session.currentCourse.title,
      youtube_url: session.currentCourse.youtube_url,
      watchedAt: new Date().toISOString(),
      completionPercentage: session.currentCourse.completionPercentage,
      questionsAnswered,
      questionsCorrect
    };

    // Add to history (keep last 20 courses)
    session.viewingHistory.unshift(courseProgress);
    if (session.viewingHistory.length > 20) {
      session.viewingHistory = session.viewingHistory.slice(0, 20);
    }

    // Clear current course
    session.currentCourse = null;

    this.saveSession(session);
  }

  /**
   * Get session data formatted for API
   */
  static getSessionData(): SessionPerformanceData | null {
    const session = this.getSession();
    if (!session) return null;

    // Include current course if active with question performance
    const recentCourses = [...session.viewingHistory];
    
    // If we have a current course, add it to the front with the current performance data
    if (session.currentCourse) {
      // Calculate questions for current course from overall performance
      // This assumes questions answered in this session are for the current course
      const questionsAnswered = session.performance.totalQuestionsAnswered;
      const questionsCorrect = session.performance.totalQuestionsCorrect;
      
      const currentCourseProgress: CourseProgress = {
        courseId: session.currentCourse.id,
        title: session.currentCourse.title,
        youtube_url: session.currentCourse.youtube_url,
        watchedAt: session.currentCourse.startedAt,
        completionPercentage: session.currentCourse.completionPercentage,
        questionsAnswered,
        questionsCorrect
      };
      
      // Add current course to the front
      recentCourses.unshift(currentCourseProgress);
    }

    return {
      sessionId: session.sessionId,
      currentCourse: session.currentCourse,
      performance: session.performance,
      recentCourses: recentCourses.slice(0, 5)
    };
  }

  /**
   * Migrate session data to user profile (called after sign-up/login)
   */
  static async migrateToUserProfile(userId: string): Promise<void> {
    const session = this.getSession();
    if (!session) return;

    try {
      // Call API to migrate session data
      const response = await fetch('/api/user/migrate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionData: this.getSessionData()
        })
      });

      if (response.ok) {
        // Clear session after successful migration
        this.clearSession();
      }
    } catch (error) {
      console.error('Failed to migrate session data:', error);
    }
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Save session to localStorage
   */
  private static saveSession(session: AnonymousSession): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Clear expired sessions (maintenance)
   */
  static clearExpiredSessions(): void {
    const session = this.getSession();
    if (session && new Date(session.expiresAt) < new Date()) {
      this.clearSession();
    }
  }
} 