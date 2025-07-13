# Anonymous User Implementation Example

This document shows how to integrate the SessionManager for anonymous user tracking.

## 1. Course Page Integration

### Update `src/pages/course/[id].tsx`

```typescript
import { SessionManager } from '@/utils/sessionManager';

// In the component
useEffect(() => {
  // Track course start for anonymous users
  if (!user && course) {
    SessionManager.setCurrentCourse(
      course.id,
      course.title,
      course.youtube_url
    );
  }
}, [user, course]);

// Update viewing progress
useEffect(() => {
  if (!user && duration > 0) {
    const percentage = (currentTime / duration) * 100;
    SessionManager.updateViewingProgress(id as string, percentage);
  }
}, [user, currentTime, duration, id]);

// In handleAnswer function
const handleAnswer = (answer: any) => {
  const question = questions[currentQuestionIndex];
  const isCorrect = checkAnswer(answer, question);
  
  // Track for anonymous users
  if (!user) {
    SessionManager.trackQuestionResult(
      question.question,
      formatUserAnswer(answer, question),
      formatCorrectAnswer(question),
      isCorrect,
      question.type,
      question.timestamp,
      question.metadata?.key_concepts?.[0]
    );
  }
  
  // Rest of existing logic...
};

// In handleVideoEnd function
const handleVideoEnd = () => {
  // Track completion for anonymous
  if (!user) {
    const questionsAnswered = answeredQuestions.size;
    const questionsCorrect = Array.from(answeredQuestions)
      .filter(idx => questionResults[`0-${idx}`])
      .length;
    
    SessionManager.completeCourse(questionsAnswered, questionsCorrect);
  }
  
  // Rest of existing logic...
};
```

## 2. Update useNextCourse Hook

### Modify `src/hooks/useNextCourse.ts`

```typescript
import { SessionManager } from '@/utils/sessionManager';

const fetchNextCourse = async () => {
  // ... existing checks ...
  
  try {
    // Get session data for anonymous users
    const sessionData = !user ? SessionManager.getSessionData() : null;
    
    // Log session data if available
    if (sessionData) {
      console.log('📊 Anonymous session data:', {
        accuracy: sessionData.performance.accuracy,
        questionsAnswered: sessionData.performance.totalQuestionsAnswered,
        wrongQuestions: sessionData.performance.wrongQuestions.length
      });
    }
    
    // Step 1: Get course suggestions with session data
    const suggestionsResponse = await fetch('/api/course/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: currentCourse?.youtube_url,
        userId: user?.id,
        courseId: currentCourseId as string,
        trigger: 'course_completion',
        sessionData: sessionData // Pass session data
      })
    });
    
    // ... rest of existing logic ...
  }
};
```

## 3. Update Suggestions API

### Modify `src/pages/api/course/suggestions.ts`

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, userId, courseId, trigger = 'course_completion', sessionData } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Use enhanced recommendations for both logged-in and anonymous users
    if (userId || sessionData) {
      console.log('🎯 Using enhanced recommendations:', {
        hasUser: !!userId,
        hasSession: !!sessionData,
        sessionAccuracy: sessionData?.performance?.accuracy
      });
      
      // Call the enhanced recommendations edge function
      const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
        body: {
          userId,
          courseId,
          trigger,
          requestedCount: 5,
          sessionData // Pass session data for anonymous users
        },
      });

      if (error) {
        console.error('Error calling enhanced recommendations:', error);
        // Fall back to basic suggestions
      } else if (data && data.recommendations && data.recommendations.length > 0) {
        // Transform enhanced recommendations to match expected format
        return res.status(200).json({
          topics: data.recommendations.map((rec: any) => ({
            topic: rec.title,
            video: rec.youtube_url,
            // Additional enhanced data
            description: rec.description,
            reasons: rec.reasons,
            difficulty_match: rec.difficulty_match,
            addresses_mistakes: rec.addresses_mistakes,
            thumbnail_url: rec.thumbnail_url,
            channel_name: rec.channel_name,
            duration: rec.duration,
            progression_type: rec.progression_type
          }))
        });
      }
    }

    // Fall back to original course-suggestions
    console.log('📚 Using basic course suggestions');
    // ... rest of fallback logic ...
  } catch (error) {
    console.error('Error in suggestions API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## 4. Helper Functions

### Add to `src/utils/courseHelpers.ts`

```typescript
export function formatUserAnswer(answer: any, question: Question): string {
  switch (question.type) {
    case 'multiple-choice':
      return question.options[answer] || `Option ${answer + 1}`;
    case 'true-false':
    case 'true_false':
      return answer === 0 ? 'True' : 'False';
    case 'matching':
      return 'Matching pairs submitted';
    case 'hotspot':
      return answer.label || 'Clicked location';
    case 'sequencing':
      return 'Sequence submitted';
    default:
      return String(answer);
  }
}

export function formatCorrectAnswer(question: Question): string {
  switch (question.type) {
    case 'multiple-choice':
      return question.options[question.correct] || `Option ${question.correct + 1}`;
    case 'true-false':
    case 'true_false':
      return question.correct === 0 ? 'True' : 'False';
    case 'matching':
      return 'Correct pairs';
    case 'hotspot':
      return question.metadata?.target_objects?.join(', ') || 'Target objects';
    case 'sequencing':
      return 'Correct sequence';
    default:
      return String(question.correct);
  }
}
```

## 5. Session Migration on Login

### Add to Auth Context or Login Handler

```typescript
// After successful login/signup
const handleSuccessfulAuth = async (user: User) => {
  // Existing auth logic...
  
  // Migrate anonymous session if exists
  await SessionManager.migrateToUserProfile(user.id);
};
```

## 6. Testing the Implementation

### Create Test Script

```javascript
// scripts/test-anonymous-recommendations.js

// Simulate anonymous user session
const testSession = {
  currentCourse: {
    id: "test-course-1",
    title: "JavaScript Part 5: Functions",
    youtube_url: "https://youtube.com/watch?v=test",
    completionPercentage: 100
  },
  performance: {
    totalQuestionsAnswered: 10,
    totalQuestionsCorrect: 8,
    accuracy: 80,
    wrongQuestions: [
      {
        question: "What is a closure?",
        userAnswer: "A function declaration",
        correctAnswer: "A function with access to outer scope",
        type: "multiple-choice"
      }
    ]
  }
};

// Test API with session data
fetch('http://localhost:3000/api/course/suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: testSession.currentCourse.youtube_url,
    courseId: testSession.currentCourse.id,
    trigger: 'course_completion',
    sessionData: testSession
  })
})
.then(res => res.json())
.then(data => console.log('Recommendations:', data));
```

## Next Steps

1. Implement the SessionManager integration in course page
2. Update the enhanced-recommendations edge function to handle sessionData
3. Add UI indicators for anonymous users ("Sign up to save progress")
4. Test series detection and progression logic
5. Implement session migration on user registration 