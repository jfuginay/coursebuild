# Initialize Learning Profile Edge Function

This edge function initializes user learning profiles by analyzing existing user data including:
- Course enrollments and completion rates
- Question response patterns and accuracy
- Created courses (if any)
- Course ratings and preferences
- Session behavior patterns

## How It Works

1. **Data Gathering**: Collects all relevant user data from multiple tables
2. **LLM Analysis**: Uses GPT-4o-mini to analyze patterns and create a comprehensive profile
3. **Profile Creation**: Stores the analyzed profile in `user_learning_profiles` table

## API Usage

```bash
# Initialize a user's learning profile
curl -X POST https://your-project.supabase.co/functions/v1/initialize-learning-profile \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "forceUpdate": false
  }'
```

### Parameters

- `userId` (required): The UUID of the user to initialize
- `forceUpdate` (optional): Force profile re-initialization even if one exists (default: false)

### Response

```json
{
  "success": true,
  "profile": {
    "user_id": "...",
    "learning_style": {
      "visual": 0.8,
      "sequential": 0.6,
      "practical": 0.7
    },
    "preferred_difficulty": {
      "intermediate": 0.8,
      "advanced": 0.2
    },
    "topic_interests": {
      "programming": 0.9,
      "mathematics": 0.6
    },
    "struggling_concepts": [...],
    "mastered_concepts": [...],
    "engagement_metrics": {...},
    "profile_confidence": 0.75
  }
}
```

## Profile Components

### Learning Style
- **visual**: Preference for visual explanations and diagrams
- **sequential**: Preference for step-by-step learning
- **conceptual**: Focus on theoretical understanding
- **practical**: Focus on real-world applications
- **collaborative**: Preference for discussion-based learning
- **independent**: Preference for self-directed learning

### Topic Interests
Dynamic map of topics with interest scores (-1 to 1)

### Struggling Concepts
Array of concepts the user has difficulty with, including:
- Concept name
- Severity score (0-1)
- Last seen date
- Frequency of struggles
- Performance accuracy (if available)

### Mastered Concepts
Array of concepts the user has demonstrated mastery of:
- Concept name
- Confidence score (0-1)
- Last demonstrated date
- Demonstration count

### Engagement Metrics
- Average session duration
- Questions per session
- Clarification rate
- Frustration events
- Success celebrations
- Engagement score

## Automatic Initialization

The profile is automatically initialized when:
1. Enhanced recommendations are requested for a user without a profile
2. The AI chat assistant processes insights for a new user
3. Manually triggered via this edge function

## Integration with Other Systems

### Enhanced Recommendations
The recommendations system automatically initializes profiles for new users, ensuring personalized recommendations from the start.

### AI Chat Assistant
Chat insights are continuously integrated into the profile, with dynamic weighting based on profile maturity.

### Performance Verification
The system cross-references chat-based insights with actual question performance data to ensure accuracy.

## Profile Evolution

Profiles evolve through:
1. **Chat Insights**: Real-time updates from AI chat conversations
2. **Performance Data**: Continuous validation against actual quiz results
3. **Decay Mechanisms**: Old interests and concepts decay over time
4. **Confidence Scoring**: Profile confidence increases with more data

## Best Practices

1. Profiles work best with at least 10+ course enrollments or 50+ question responses
2. Chat insights significantly improve profile accuracy
3. Regular usage leads to more accurate personalization
4. Profiles automatically adapt to changing user interests and skill levels 