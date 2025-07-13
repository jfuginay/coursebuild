# Anonymous User Enhanced Recommendations Plan

## Overview

Enable the full enhanced recommendation system with series progression support for users who are not logged in, providing a seamless learning experience that encourages eventual sign-up.

## Current State

- **Logged-in users**: Get enhanced recommendations with series detection, performance-based progression, and personalized suggestions
- **Anonymous users**: Fall back to basic course-suggestions without any personalization or progression logic

## Proposed Solution

### 1. Session-Based Performance Tracking

Create a client-side performance tracking system that stores data in localStorage:

```typescript
interface AnonymousSession {
  sessionId: string; // Generated UUID
  createdAt: string;
  expiresAt: string; // 30 days
  currentCourse: {
    id: string;
    title: string;
    youtube_url: string;
    completionPercentage: number;
  };
  performance: {
    questionsAnswered: number;
    questionsCorrect: number;
    accuracy: number;
    wrongQuestions: Array<{
      question: string;
      userAnswer: string;
      correctAnswer: string;
      type: string;
    }>;
  };
  viewingHistory: Array<{
    courseId: string;
    title: string;
    watchedAt: string;
    completionPercentage: number;
  }>;
}
```

### 2. Frontend Implementation

#### A. Create Session Manager (`src/utils/sessionManager.ts`)
```typescript
export class SessionManager {
  private static STORAGE_KEY = 'courseforge_anonymous_session';
  
  static getSession(): AnonymousSession | null;
  static createSession(): AnonymousSession;
  static updatePerformance(questionResult: QuestionResult): void;
  static updateViewingProgress(courseId: string, percentage: number): void;
  static getSessionData(): SessionPerformanceData;
  static clearExpiredSessions(): void;
}
```

#### B. Update Course Page (`src/pages/course/[id].tsx`)
- Track question performance for anonymous users
- Store viewing progress in session
- Pass session data when fetching recommendations

#### C. Update useNextCourse Hook
```typescript
// Modified fetchNextCourse
const sessionData = !user ? SessionManager.getSessionData() : null;

const suggestionsResponse = await fetch('/api/course/suggestions', {
  body: JSON.stringify({
    videoUrl: currentCourse?.youtube_url,
    userId: user?.id,
    courseId: currentCourseId,
    trigger: 'course_completion',
    // NEW: Pass session data for anonymous users
    sessionData: sessionData
  })
});
```

### 3. Backend Implementation

#### A. Update Suggestions API (`src/pages/api/course/suggestions.ts`)
```typescript
const { videoUrl, userId, courseId, trigger, sessionData } = req.body;

// Use enhanced recommendations for both logged-in and anonymous users
if (userId || sessionData) {
  const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
    body: {
      userId,
      courseId,
      trigger,
      requestedCount: 5,
      // NEW: Pass session data for anonymous users
      sessionData: sessionData
    },
  });
}
```

#### B. Update Enhanced Recommendations Function
Modify `supabase/functions/enhanced-recommendations/index.ts` to handle anonymous users:

```typescript
interface RecommendationRequest {
  userId?: string; // Now optional
  courseId?: string;
  trigger: string;
  requestedCount?: number;
  sessionData?: SessionPerformanceData; // NEW
}

// In the main handler:
if (userId) {
  // Existing logic for logged-in users
} else if (sessionData) {
  // NEW: Handle anonymous users
  const anonymousProfile = createAnonymousProfile(sessionData);
  const anonymousPerformance = extractSessionPerformance(sessionData);
  const anonymousWrongQuestions = sessionData.performance.wrongQuestions;
  
  // Use same recommendation logic with anonymous data
}
```

### 4. Key Features to Implement

#### A. Anonymous Profile Generation
```typescript
function createAnonymousProfile(sessionData: SessionPerformanceData) {
  return {
    learning_style: inferLearningStyle(sessionData),
    preferred_difficulty: inferDifficulty(sessionData.performance.accuracy),
    struggling_concepts: extractStrugglingConcepts(sessionData.performance.wrongQuestions),
    profile_confidence: 0.3, // Lower confidence for anonymous
    is_anonymous: true
  };
}
```

#### B. Series Detection (Works Same for Anonymous)
- Current video title analysis
- Performance-based progression rules
- Natural topic advancement

#### C. Session Data Persistence
- Store up to 30 days
- Migrate to user profile on sign-up
- Clear expired sessions automatically

### 5. User Experience Flow

1. **Anonymous user watches video** → Performance tracked in localStorage
2. **Completes course** → Enhanced recommendations based on session data
3. **Series detected** → Next episode suggested based on performance
4. **Encouragement to sign up** → "Create an account to save your progress!"
5. **On sign-up** → Session data migrates to permanent profile

### 6. Implementation Priority

1. **Phase 1**: Session tracking infrastructure (2-3 days)
   - SessionManager utility
   - localStorage schema
   - Basic performance tracking

2. **Phase 2**: Frontend integration (2-3 days)
   - Update course page
   - Modify useNextCourse hook
   - Pass session data to API

3. **Phase 3**: Backend modifications (3-4 days)
   - Update suggestions API
   - Modify enhanced-recommendations function
   - Handle anonymous profiles

4. **Phase 4**: Testing & refinement (2 days)
   - Test series detection
   - Verify progression logic
   - Performance optimization

### 7. Benefits

- **Better user experience**: Personalized recommendations without sign-up friction
- **Increased engagement**: Users more likely to continue learning
- **Conversion driver**: Show value before requiring registration
- **Data continuity**: Seamless transition from anonymous to registered

### 8. Technical Considerations

- **Privacy**: All data stored client-side until user signs up
- **Performance**: Minimal overhead with localStorage
- **Scalability**: No additional server load for anonymous users
- **Migration**: Clean path to convert anonymous → registered

### 9. Success Metrics

- Anonymous user course completion rate
- Click-through rate on recommendations
- Conversion rate (anonymous → registered)
- Series continuation rate for anonymous users

### 10. Future Enhancements

- Cross-device session sync (with optional email)
- A/B testing different progression strategies
- Machine learning on anonymous patterns
- Progressive disclosure of features 