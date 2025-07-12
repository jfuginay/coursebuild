# Enhanced Recommendations API Examples (v4.1)

## API Endpoints

### Enhanced Recommendations
```
POST /functions/v1/enhanced-recommendations
```

### Initialize Learning Profile (NEW)
```
POST /functions/v1/initialize-learning-profile
```

## Request Format

### Basic Recommendation Request
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "trigger": "manual_request",
  "requestedCount": 5
}
```

### Recommendation After Course Completion
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "courseId": "456e7890-e89b-12d3-a456-426614174000",
  "trigger": "course_completion",
  "requestedCount": 3
}
```

### Initialize Learning Profile (v4.1)
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Response:
```json
{
  "profile": {
    "learning_styles": {
      "visual": 0.65,
      "sequential": 0.4,
      "conceptual": 0.75,
      "practical": 0.6
    },
    "topic_interests": [
      {"topic": "machine learning", "score": 0.8},
      {"topic": "recursion", "score": -0.3},
      {"topic": "data structures", "score": 0.5}
    ],
    "struggling_concepts": [
      {
        "concept": "recursive base cases",
        "severity": 0.7,
        "accuracy": 0.25,
        "last_seen": "2024-01-15T10:30:00Z"
      }
    ],
    "profile_confidence": 0.65
  },
  "data_sources": {
    "courses_enrolled": 12,
    "questions_answered": 156,
    "recent_responses": 48,
    "completion_rate": 0.67
  }
}
```

## Response Format

### Success Response
```json
{
  "recommendations": [
    {
      "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "title": "Understanding Recursion - A Visual Guide",
      "description": "This video perfectly addresses your struggles with recursive function calls by using visual diagrams to show the call stack.",
      "channel_name": "CS Dojo",
      "duration": "12:45",
      "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "score": 0.95,
      "reasons": [
        "Directly addresses your wrong answer about recursive base cases",
        "Uses visual learning style matching your preference (85% visual)",
        "Covers the factorial example you struggled with in question 3",
        "Appropriate difficulty level based on your current understanding",
        "From a trusted educational channel with clear explanations"
      ],
      "difficulty_match": "perfect",
      "interest_alignment": 0.88,
      "predicted_engagement": 0.92,
      "addresses_mistakes": [
        "Recursive base case identification",
        "Stack overflow prevention",
        "Return value propagation"
      ]
    },
    {
      "youtube_url": "https://www.youtube.com/watch?v=abc123",
      "title": "Recursion Problems - Practice Session",
      "description": "Practice problems to reinforce recursion concepts with step-by-step solutions.",
      "channel_name": "Programming with Mosh",
      "duration": "18:30",
      "thumbnail_url": "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
      "score": 0.87,
      "reasons": [
        "Provides practice problems similar to ones you missed",
        "Includes debugging tips for common recursion errors",
        "Matches your preference for practical examples",
        "Progressive difficulty to build confidence"
      ],
      "difficulty_match": "challenging",
      "interest_alignment": 0.75,
      "predicted_engagement": 0.83,
      "addresses_mistakes": [
        "Recursive function debugging",
        "Common recursion pitfalls"
      ]
    }
  ],
  "recommendation_id": "789e0123-e89b-12d3-a456-426614174000",
  "insights_used": 47,
  "profile_confidence": 0.82,
  "wrong_questions_considered": 3
}
```

## How the System Works

### 1. Data Collection Phase
The system gathers comprehensive data about the user:
- **Learning Profile**: Accumulated from chat insights (visual: 0.85, sequential: 0.6, etc.)
  - Automatically initialized for new users using existing data
  - Weighted updates based on profile maturity (15-35%)
  - Performance verification against actual quiz results
- **Recent Chat Insights**: Last 50 interactions analyzed for patterns
- **Wrong Questions**: Enhanced analysis includes:
  - Full question text and all answer options
  - User's selected answer (text, not just index)
  - Correct answer with detailed explanation
  - Key concepts extracted from explanations
- **Performance History**: Accuracy rates and time spent on different question types
- **Course History**: Completed and in-progress courses

### 2. Wrong Question Analysis (v4.1 Enhanced)
The system now shows full question details with user selections:
```
Wrong Answer Analysis:
1. [multiple-choice] Question: "What is the base case in this recursive function?"
   Options:
     1. return n * factorial(n-1)
     2. if n <= 1: return 1 ✓ (correct)
     3. factorial(n-1) ← (user selected)
     4. n == 0
   Explanation: The base case prevents infinite recursion...
```

### 3. Search Term Generation
LLM analyzes the enhanced data to generate targeted YouTube search terms:
```json
{
  "search_terms": [
    "recursion tutorial visual explanation beginner",
    "recursive base case common mistakes programming",
    "stack overflow recursion debugging",
    "recursion vs iteration comparison", 
    "recursive thinking problem solving",
    "factorial function base case explanation",
    "avoiding infinite recursion programming"
  ]
}
```

### 4. Video Search & Discovery
- SerpAPI searches YouTube for each term (7+ search terms)
- Filters videos between 2-20 minutes (3-15 min preferred)
- Collects metadata for top candidates
- YouTube oEmbed API fetches additional details

### 5. Final Selection
LLM evaluates all video candidates considering:
- Which specific mistakes each video addresses
- Alignment with user's learning style (with percentage scores)
- Appropriate difficulty level based on performance data
- Channel quality and reputation
- Content relevance to struggled concepts
- Duration preference (<10 minutes scores higher)

## Integration Example

### Frontend Implementation
```typescript
// In your React component
const getPersonalizedRecommendations = async () => {
  const response = await fetch('/api/enhanced-recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseToken}`
    },
    body: JSON.stringify({
      userId: currentUser.id,
      courseId: currentCourseId,
      trigger: 'course_completion',
      requestedCount: 5
    })
  });
  
  const data = await response.json();
  
  // Display recommendations with rich metadata
  data.recommendations.forEach(rec => {
    console.log(`Recommended: ${rec.title}`);
    console.log(`Because: ${rec.reasons[0]}`);
    console.log(`Fixes: ${rec.addresses_mistakes.join(', ')}`);
  });
};
```

### Displaying Recommendations
```jsx
<div className="recommendation-card">
  <img src={rec.thumbnail_url} alt={rec.title} />
  <h3>{rec.title}</h3>
  <p className="channel">{rec.channel_name} • {rec.duration}</p>
  <p className="description">{rec.description}</p>
  
  <div className="reasons">
    <h4>Why this is perfect for you:</h4>
    <ul>
      {rec.reasons.map(reason => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  </div>
  
  {rec.addresses_mistakes.length > 0 && (
    <div className="addresses-mistakes">
      <h4>Helps with:</h4>
      <ul>
        {rec.addresses_mistakes.map(mistake => (
          <li key={mistake}>{mistake}</li>
        ))}
      </ul>
    </div>
  )}
  
  <div className="metrics">
    <span>Match Score: {(rec.score * 100).toFixed(0)}%</span>
    <span>Difficulty: {rec.difficulty_match}</span>
  </div>
  
  <a href={rec.youtube_url} target="_blank" className="watch-button">
    Watch on YouTube
  </a>
</div>
```

## Error Handling

### Missing API Keys
```json
{
  "error": "SERPAPI_API_KEY not configured"
}
```

### No Wrong Questions Available
The system gracefully handles cases where no wrong questions exist:
- Still generates recommendations based on profile and insights
- `wrong_questions_considered` will be 0
- Recommendations focus on advancing learning rather than fixing mistakes

### Rate Limiting
- SerpAPI searches are limited to 3 per request
- Each search returns up to 5 videos
- Maximum 15 video candidates per recommendation request

## Environment Variables Required
```bash
# In Supabase Edge Function environment
OPENAI_API_KEY=sk-...
SERPAPI_API_KEY=...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
LANGSMITH_API_KEY=... # For LLM call monitoring
LANGSMITH_PROJECT=enhanced-recommendations # Optional, defaults to 'enhanced-recommendations'
```

## LangSmith Integration

All LLM calls are automatically logged to LangSmith for monitoring and debugging:

1. **View Traces**: Each recommendation request creates traces in LangSmith showing:
   - Search term generation with user context
   - Video selection logic and scoring
   - Token usage and response times
   - Any errors or retries

2. **Debug Recommendations**: Use LangSmith traces to understand:
   - Why certain videos were selected
   - How user mistakes influenced search terms
   - Which aspects of the profile had the most impact
   - Performance bottlenecks in the pipeline

3. **Monitor Usage**: Track:
   - Total tokens used per recommendation
   - Average response times
   - Error rates by stage
   - Cost per recommendation

Access traces at: https://smith.langchain.com/projects/enhanced-recommendations 