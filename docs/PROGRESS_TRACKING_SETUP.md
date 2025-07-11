# 📊 Real-time Progress Tracking System Setup Guide

## Overview

This guide shows how to implement real-time progress tracking for the CourseForge AI video processing pipeline, providing users with detailed insights into each stage of course generation.

## 🎯 Features

### **Pipeline-Level Progress**
- ✅ **Overall Progress Bar**: 0-100% completion across all stages
- ✅ **Stage Indicators**: Visual progress through initialization, planning, generation, quality verification, and storage
- ✅ **Time Tracking**: Elapsed time and estimated completion
- ✅ **Real-time Updates**: Live progress updates via Supabase Realtime

### **Question-Level Details**
- ✅ **Individual Question Progress**: Track each question's generation status
- ✅ **AI Provider Information**: See which AI service (OpenAI/Gemini) is handling each question
- ✅ **Processing Reasoning**: Understand why each question type was chosen
- ✅ **Performance Metrics**: Processing time for each question
- ✅ **Error Reporting**: Detailed error messages for failed questions

## 🛠️ Setup Instructions

### 1. **Database Migration**

Apply the progress tracking migration:

```bash
# Run the migration
supabase db push

# Or manually apply the migration file
psql -d your_database -f supabase/migrations/003_add_progress_tracking.sql
```

### 2. **Enable Supabase Realtime**

Ensure Realtime is enabled for progress tables:

```sql
-- Enable realtime for progress tables
ALTER PUBLICATION supabase_realtime ADD TABLE processing_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE question_progress;
```

### 3. **Backend Integration**

Update your existing quiz generation pipeline to include progress tracking:

```typescript
// In your quiz generation function
import { createProgressTracker } from './utils/progress-tracker';

const executeQuizGenerationPipeline = async (request) => {
  // Create progress tracker
  const tracker = createProgressTracker(
    supabaseClient, 
    request.course_id, 
    request.session_id
  );

  // Track stages
  await tracker.startStage('initialization', 'Starting video analysis');
  // ... your existing code ...
  await tracker.completeStage('initialization', 'Video analysis complete');

  // Track individual questions
  for (const plan of questionPlans) {
    await tracker.planQuestion(
      plan.question_id, 
      plan.question_type, 
      `Planning ${plan.question_type} for ${plan.learning_objective}`
    );
  }
};
```

### 4. **Frontend Implementation**

Add the ProgressTracker component to your course creation page:

```tsx
import { ProgressTracker } from '@/components/ProgressTracker';

const CourseCreationPage = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);

  const handleCreateCourse = async () => {
    // Generate unique session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    // Start processing with progress tracking
    const response = await fetch('/api/course/analyze-video-with-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: courseId,
        youtube_url: youtubeUrl,
        session_id: newSessionId,
        max_questions: 4
      })
    });
  };

  return (
    <div>
      {sessionId && courseId && (
        <ProgressTracker
          courseId={courseId}
          sessionId={sessionId}
          onComplete={(questions) => console.log('Complete!', questions)}
          onError={(error) => console.error('Error:', error)}
        />
      )}
    </div>
  );
};
```

## 📋 Database Schema

### **processing_progress Table**
```sql
CREATE TABLE processing_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    stage TEXT NOT NULL, -- 'initialization', 'planning', 'generation', etc.
    stage_progress FLOAT NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
    overall_progress FLOAT NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
    current_step TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **question_progress Table**
```sql
CREATE TABLE question_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_type TEXT NOT NULL,
    status TEXT NOT NULL, -- 'planned', 'generating', 'completed', 'failed', 'validating'
    progress FLOAT NOT NULL DEFAULT 0.0,
    reasoning TEXT,
    provider_used TEXT, -- 'openai', 'gemini', 'gemini-vision'
    processing_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 Progress Flow

### **Stage Progression**
1. **Initialization** (5% weight) - Setup and validation
2. **Planning** (25% weight) - Video analysis and question planning  
3. **Generation** (50% weight) - AI-powered question creation
4. **Quality Verification** (15% weight) - Optional quality assessment
5. **Storage** (5% weight) - Database persistence
6. **Completed** - Success state
7. **Failed** - Error state

### **Question Status Flow**
1. **Planned** - Question type and parameters determined
2. **Generating** - AI provider is creating the question
3. **Validating** - Quality verification in progress
4. **Completed** - Question successfully generated
5. **Failed** - Question generation failed

## 🎨 UI Components

### **Overall Progress Card**
- Progress bar showing 0-100% completion
- Current stage indicator with icons
- Elapsed time display
- Current step description

### **Question Details Card**
- Individual question progress bars
- AI provider badges (OpenAI/Gemini)
- Processing reasoning explanations
- Error messages for failed questions
- Processing time metrics

## 📊 Example Usage

Visit `/create-with-progress` to see the full implementation in action:

1. **Enter YouTube URL** - Start the course creation process
2. **Watch Progress** - See real-time updates as the video is processed
3. **Question Details** - Monitor individual question generation
4. **Completion** - View final results and navigate to the course

## 🔧 Customization Options

### **Custom Stage Weights**
```typescript
const customWeights = new Map([
  ['initialization', 0.10],
  ['planning', 0.30],
  ['generation', 0.40],
  ['quality_verification', 0.15],
  ['storage', 0.05]
]);
```

### **Custom Progress Updates**
```typescript
await tracker.updateProgress({
  stage: 'generation',
  stage_progress: 0.5,
  overall_progress: 0.6,
  current_step: 'Generating question 3 of 5',
  details: {
    questions_completed: 2,
    questions_remaining: 3,
    estimated_time_remaining: '45 seconds'
  }
});
```

### **Custom Question Reasoning**
```typescript
await tracker.updateQuestionProgress({
  question_id: 'q1_mcq_intro',
  question_type: 'multiple-choice',
  status: 'generating',
  progress: 0.8,
  reasoning: 'Creating multiple-choice question to test understanding of key concepts introduced in the first 2 minutes of the video',
  provider_used: 'openai'
});
```

## 🚀 Performance Considerations

- **Real-time Updates**: Updates are sent via Supabase Realtime, providing instant feedback
- **Efficient Queries**: Progress tables use optimized indexes for fast lookups
- **Session Management**: Each processing session has a unique ID to avoid conflicts
- **Error Handling**: Comprehensive error tracking and recovery mechanisms

## 🔒 Security & Privacy

- **Row Level Security**: RLS policies ensure users can only see their own progress
- **Session Isolation**: Each processing session is completely isolated
- **Error Sanitization**: Sensitive error details are not exposed to the frontend
- **Automatic Cleanup**: Old progress records can be cleaned up automatically

## 🎯 Benefits

1. **User Experience**: Users see exactly what's happening during processing
2. **Debugging**: Detailed logs help identify and fix issues quickly
3. **Performance Monitoring**: Track processing times and optimization opportunities
4. **Transparency**: Users understand the AI reasoning behind each question type
5. **Error Recovery**: Clear error messages help users understand and resolve issues

## 📱 Mobile Responsiveness

The progress tracking UI is fully responsive and works on:
- ✅ Desktop browsers
- ✅ Tablet devices  
- ✅ Mobile phones
- ✅ Progressive Web Apps

## 🧪 Testing

Test the complete flow:

```bash
# Run the example page
npm run dev
# Visit http://localhost:3000/create-with-progress

# Test with a YouTube URL
# Watch real-time progress updates
# Verify question-level details
# Check error handling
```

---

*This progress tracking system provides a professional, real-time view into the CourseForge AI processing pipeline, enhancing user confidence and debugging capabilities.* 