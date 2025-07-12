# Enhanced Course Recommendations with AI Chat Insights

### Overview
CourseForge AI's recommendation system uses multiple data sources to provide truly personalized YouTube video recommendations:
- AI-extracted insights from every chat conversation
- Wrong question analysis from completed courses
- User learning profiles built from performance data
- Real-time YouTube search with intelligent filtering

### Algorithm Version: 4.1 (January 2025)

## Key Features

### 1. Zero Hardcoded Logic
- All recommendations driven by LLM intelligence
- No fixed rules or heuristics
- Adapts to each user's unique learning journey

### 2. Multi-Source Personalization
- **Chat Insights**: Extracts learning preferences, struggles, and interests from conversations
- **Wrong Questions**: Analyzes mistakes to identify knowledge gaps
- **Performance Data**: Tracks accuracy, engagement, and progress
- **Learning Profile**: Builds comprehensive understanding of user's style

### 3. Real YouTube Integration
- Searches YouTube using SerpAPI based on LLM-generated terms
- Filters videos for quality and appropriate duration (2-20 minutes max)
- Prioritizes shorter videos (5-15 minutes ideal) for better engagement
- Fetches metadata via YouTube oEmbed API
- LLM selects best matches from real video candidates

### 4. Continuous Learning
- Every chat interaction updates user profile
- Insights extracted asynchronously without impacting performance
- Profiles evolve with weighted merging of new data

### 5. Enhanced Wrong Question Analysis (v4.1)
- **Full Option Display**: Shows all answer choices with clear indicators
- **Smart Parsing**: Handles question options stored as JSON strings
- **Response Tracking**: Uses both `response_text` and `selected_answer` fields
- **Visual Clarity**: 
  - Multiple choice shows all options with ✓ for correct and ← for user selection
  - True/False shows clear user vs correct answer comparison
- **Improved Context**: Explanations show why answers matter, not just correct info

## Technical Implementation

### Profile Initialization (NEW)
The system now automatically initializes learning profiles from existing user data:
- **Course Enrollments**: Analyzes video watching patterns and completion rates
- **Question Performance**: Extracts learning strengths and weaknesses
- **Session Behavior**: Identifies time preferences and engagement patterns
- **Course Creations**: Understands user expertise areas
- **Ratings Given**: Infers content preferences

### Enhanced Profile Evolution
- **Dynamic Weighting**: New insights weighted based on profile maturity (15-35%)
- **Performance Verification**: Chat insights validated against quiz results
- **Concept Decay**: Struggling concepts fade if performance improves
- **Confidence Tracking**: Profile confidence increases with more data

### Database Schema
```sql
-- Chat insights from AI assistant
chat_insights:
  - user_id
  - course_id
  - session_id
  - insight_type (9 types)
  - insight_content
  - confidence_score

-- Aggregated learning profiles
user_learning_profiles:
  - learning_style (visual, auditory, etc.)
  - topic_interests
  - struggling_concepts
  - mastered_concepts
  - profile_confidence

-- Recommendation tracking
recommendation_history:
  - recommended_courses
  - recommendation_context
  - insights_snapshot
  - performance_snapshot
```

### Edge Functions

#### ai-chat-assistant
- Handles chat conversations with visual generation
- Extracts insights asynchronously using GPT-4o-mini
- Updates user profiles with enhanced merge logic
- All LLM calls tracked via LangSmith

#### enhanced-recommendations
- Gathers comprehensive user data from 5+ sources
- Generates targeted search terms with LLM analysis
- Searches real YouTube videos via SerpAPI
- Filters by duration (max 20 minutes)
- Prioritizes shorter videos for engagement
- Selects best matches with detailed reasoning
- All LLM calls monitored in LangSmith

#### initialize-learning-profile (NEW)
- Creates profiles from existing user data
- Analyzes patterns with GPT-4o-mini
- No hardcoded assumptions or placeholders
- Calculates initial confidence scores
- Integrated with LangSmith tracking

### Key Improvements Over Basic System
1. **Real Videos**: No more generic AI-generated suggestions
2. **Mistake-Based**: Directly addresses wrong answers with full context
3. **Profile-Aware**: Considers learning style and preferences with percentages
4. **Context-Aware**: Maintains continuity from current video
5. **Duration-Optimized**: Focuses on 3-15 minute videos for optimal learning
6. **Comprehensive Analysis**: Full user data analysis in prompt generation
7. **Zero Placeholders**: All logic driven by LLM analysis of actual data

## API Usage

### Request
```json
POST /functions/v1/enhanced-recommendations
{
  "userId": "user-123",
  "courseId": "course-456",
  "trigger": "course_completion",
  "requestedCount": 5
}
```

### Response
```json
{
  "recommendations": [{
    "youtube_url": "https://youtube.com/watch?v=...",
    "title": "Understanding Vectors",
    "duration": "8:42",
    "reasons": [
      "Addresses your confusion about vector multiplication",
      "Uses visual explanations matching your learning style",
      "Perfect difficulty level based on your progress"
    ],
    "addresses_mistakes": ["vector dot product", "magnitude calculation"]
  }],
  "insights_used": 15,
  "wrong_questions_considered": 3
}
```

## Progress Tracking

### Phase 1: Database Infrastructure ✅
- Migration created and ready
- Tables for insights, profiles, and history

### Phase 2: Chat Insight Extraction ✅
- Insight extractor module complete
- Zero hardcoded patterns
- Automatic profile updates

### Phase 3: Enhanced Recommendations ✅
- Wrong question integration
- YouTube search implementation
- Duration filtering (2-20 minutes)
- LLM-based selection
- LangSmith monitoring

### Phase 4: Frontend Integration ✅
- API endpoints updated
- UI shows reasoning
- Chat passes userId

### Phase 5: Production Ready ✅
- Database migration deployed
- All edge functions live
- Environment variables configured
- Profile initialization automatic

### Phase 6: Advanced Features ✅
- **Profile Initialization**: Creates comprehensive profiles from existing user data
- **Dynamic Weighting**: Updates based on profile maturity
- **Performance Verification**: Cross-references insights with actual quiz results
- **Concept Decay**: Old interests and struggles fade over time
- **Engagement Scoring**: Tracks user engagement patterns

### Phase 7: v4.1 Improvements ✅
- **Enhanced Wrong Answer Analysis**: Full option display with user selections
- **Smart Option Parsing**: Handles JSON-stored question options
- **Response Text Support**: Uses actual answer text, not just indices
- **Improved Duration Preferences**: 3-15 minutes ideal, <10 min optimal
- **Comprehensive User Analysis**: Detailed profile breakdown in prompts
- **Better Visual Indicators**: Clear ✓ and ← markers in analysis

## Required Environment Variables
- `SERPAPI_API_KEY`: For YouTube search
- `OPENAI_API_KEY`: For LLM processing
- `LANGSMITH_API_KEY`: For monitoring
- `SUPABASE_URL`: Database connection
- `SUPABASE_SERVICE_ROLE_KEY`: Service access

## Deployment Commands

```bash
# Deploy the updated AI chat assistant
supabase functions deploy ai-chat-assistant

# Deploy the enhanced recommendations function
supabase functions deploy enhanced-recommendations

# Deploy the new profile initialization function
supabase functions deploy initialize-learning-profile

# Deploy all functions at once
supabase functions deploy ai-chat-assistant enhanced-recommendations initialize-learning-profile
```

## Monitoring

All LLM calls are tracked in LangSmith with descriptive names:
- `AI Chat Insight Extraction - [Course Name]`
- `Initialize Learning Profile - User [ID]`
- `Enhanced Recommendations - Video Selection ([n] candidates)`

## Video Duration Strategy (Updated v4.1)
- **Maximum Duration**: 20 minutes (hard limit)
- **Ideal Range**: 3-15 minutes (updated from 5-15)
- **Optimal Length**: <10 minutes preferred for maximum engagement
- **Minimum**: 2 minutes (quality threshold)
- **Ranking**: Shorter videos (<10 min) scored higher than longer ones (15-20 min) when content quality similar
- **Rationale**: Better engagement, completion rates, and learning retention 