# Enhanced Recommendations System

## Overview

The Enhanced Recommendations System is an AI-powered course recommendation engine that provides personalized next course suggestions based on user performance, learning profile, and chat interactions. It replaces the legacy hardcoded algorithms with intelligent LLM-driven analysis.

## Key Features

### 1. **Personalized Learning Profiles**
- Automatic profile initialization from existing user data
- Dynamic profile evolution based on performance
- Learning style detection (visual, sequential, conceptual, practical)
- Struggling concept tracking with severity scores
- Topic interest scoring (-1 to +1)
- Engagement pattern analysis

### 2. **AI Chat Insight Extraction**
- Analyzes every chat interaction for learning insights
- Extracts struggling concepts and learning preferences
- Cross-references insights with quiz performance
- Updates profile dynamically with weighted updates (15-35%)

### 3. **Wrong Question Analysis**
- Comprehensive mistake tracking with detailed context
- Shows user's selected answer vs correct answer
- Provides explanations for each mistake
- Generates targeted recommendations based on specific errors

### 4. **Real YouTube Video Search**
- Multi-stage search process with 7+ LLM-generated terms
- SerpAPI integration for actual YouTube content
- Video metadata fetching with thumbnails
- Duration filtering (max 20 minutes, ideal 5-15 minutes)
- LLM-based selection with detailed reasoning

### 5. **Smart Recommendation Display**
- Personalized reasons for each recommendation
- Specific mistake addressing ("Helps with: Confused CRI with color temperature")
- Difficulty matching (too_easy/perfect/challenging/too_hard)
- Video metadata including duration and channel info

## Architecture

### Edge Functions
1. **enhanced-recommendations**: Main recommendation engine
2. **ai-chat-assistant**: Enhanced with profile update capabilities
3. **initialize-learning-profile**: Creates profiles from historical data

### Database Tables
- `learning_profiles`: Stores comprehensive user profiles
- `chat_insights`: Tracks extracted insights from conversations
- `user_course_creations`: Course creation history
- `user_course_enrollments`: Enrollment tracking
- `user_question_responses`: Detailed question performance

## API Usage

### Request
```json
POST /functions/v1/enhanced-recommendations
{
  "userId": "user-uuid",
  "courseId": "current-course-uuid",
  "wrongQuestions": [...],
  "trigger": "course_completion"
}
```

### Response
```json
{
  "recommendations": [{
    "video_id": "youtube-id",
    "title": "Understanding Color Temperature",
    "reasons": [
      "Addresses confusion between CRI and color temperature",
      "Visual demonstrations align with your learning style",
      "Builds on concepts from previous course"
    ],
    "difficulty_match": "perfect",
    "addresses_mistakes": [
      "Confused CRI with color temperature",
      "Incorrectly matched light sources to CRI values"
    ],
    "duration": "12:34",
    "channel_name": "Educational Channel",
    "thumbnail_url": "..."
  }]
}
```

## Recent Improvements (v4.1-v4.2)

### Fixed Wrong Questions Loading
- **Issue**: Database queries weren't returning user's wrong answers
- **Solution**: Fixed joins and queries in multiple data fetching functions
- **Result**: AI now receives complete mistake context for better recommendations

### Course Publishing Fix
- **Issue**: Some courses marked as `published = false` despite having questions
- **Solution**: Created diagnostic script and fixed affected courses
- **Result**: All valid courses now accessible for recommendations

### Duration Filtering
- **Maximum**: 20 minutes (hard limit)
- **Ideal Range**: 5-15 minutes for optimal engagement
- **Implementation**: Both search filtering and LLM ranking

### Meaningful Mistake Descriptors
- **Before**: Generic "mistake 1, mistake 2" labels
- **After**: Specific descriptions like "Confused CRI with color temperature"
- **Impact**: Users understand exactly what the recommended video addresses

### Current Course Context
- **Addition**: System now fetches and includes current course details
- **Benefit**: Ensures recommendations build upon completed content
- **Implementation**: Additional database query in main function

### Improved LangSmith Logging
- **Format**: `<Function> - <Action> - <Model>`
- **Examples**: 
  - `Enhanced Recommendations - Gemini gemini-2.0-flash`
  - `Insight Extraction - AI Chat - Understanding Light`
- **Benefit**: Better visibility in LangSmith dashboard

## Configuration

### Environment Variables
```bash
SERPAPI_API_KEY=your-serpapi-key        # For YouTube search
OPENAI_API_KEY=your-openai-key          # For GPT-4o-mini
GEMINI_API_KEY=your-gemini-key          # For video selection
LANGSMITH_API_KEY=your-langsmith-key    # For logging
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

### Deployment
```bash
# Deploy the enhanced recommendations function
npx supabase functions deploy enhanced-recommendations

# Deploy supporting functions
npx supabase functions deploy ai-chat-assistant
npx supabase functions deploy initialize-learning-profile
```

## Monitoring & Debugging

### LangSmith Integration
All LLM calls are logged with descriptive names:
- Profile initialization steps
- Search term generation
- Video selection reasoning
- Insight extraction from chats

### Debug Scripts
- `test-enhanced-recommendations.js`: Test full recommendation flow
- `test-user-performance-data.js`: Verify user data loading
- `test-wrong-questions-for-course.js`: Check mistake tracking
- `check-course-status.js`: Diagnose course availability

## Future Enhancements

1. **Multi-language Support**: Recommendations in user's preferred language
2. **Collaborative Filtering**: Learn from similar users' successful paths
3. **Prerequisite Tracking**: Ensure foundational concepts before advanced topics
4. **Learning Path Generation**: Multi-course sequences for comprehensive learning
5. **Offline Capability**: Download recommended courses for offline viewing

## Troubleshooting

### No Recommendations Returned
1. Check if user has learning profile (auto-created on first call)
2. Verify SerpAPI key is valid and has credits
3. Check LangSmith logs for API errors

### Generic Mistake Descriptions
1. Ensure latest function version is deployed
2. Check that wrong questions include all required fields
3. Verify prompt includes specific descriptor instructions

### Videos Too Long
1. Duration filter is set to max 20 minutes
2. Check if search terms are too broad
3. Consider adjusting ideal range in prompt

---

*Enhanced Recommendations v4.2 - AI-powered personalized learning paths with comprehensive user understanding* 