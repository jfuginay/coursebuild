# InfoBite Agent Feature Documentation

## Overview

The InfoBite Agent is an adaptive learning assistant that provides contextual hints and micro-lessons to learners based on their autonomy settings and performance. It intelligently monitors learner behavior and offers timely assistance without being intrusive.

## Architecture

### Components

1. **Database Schema** (`006_add_infobite_agent.sql`)
   - `learner_events` table: Tracks WATCH, QUIZ_WRONG, and HINT_SHOWN events
   - `user_hint_cooldowns` table: Manages hint frequency per user/course
   - Helper functions for wrong answer streaks and cooldown management

2. **Edge Function** (`inject-insight`)
   - Analyzes learner context and decides whether to generate hints
   - Uses transcript segments to provide contextual guidance
   - Respects autonomy levels and cooldown periods

3. **Frontend Components**
   - `useInfoBite` hook: Manages polling and hint state
   - `InfoBiteToast`: Displays hints with auto-dismiss
   - `AutonomySlider`: User control for hint frequency

4. **Integration Points**
   - Course page tracks wrong/correct answers
   - Video player state changes trigger watch events
   - Question responses are logged for analysis

## Autonomy Levels

### Level 0: Manual Mode
- No hints are ever shown
- Complete learner autonomy
- InfoBite is effectively disabled

### Level 1: Help Mode
- Occasional hints when struggling
- 90-second cooldown between hints
- 15% chance of proactive hints

### Level 2: Guide Me Mode
- Active guidance and immediate help
- 45-second cooldown (bypassed for high wrong answer streaks)
- 30% chance of proactive hints
- Instant hints after 2+ wrong answers

## Business Rules

1. **Cooldown Management**
   - Prevents hint spam across tabs/sessions
   - Tracked in database for persistence
   - Bypassed in Guide mode for struggling learners

2. **Hint Generation**
   - Maximum 140 characters
   - Based on transcript context (±60 seconds)
   - Prioritizes current concepts and visual elements

3. **Event Tracking**
   - All interactions logged in `learner_events`
   - Enables analytics and improvement
   - Privacy-conscious design

## Deployment

### Database Migration
```bash
# Run the migration to create tables
psql $DATABASE_URL < supabase/migrations/006_add_infobite_agent.sql
```

### Edge Function Deployment
```bash
# Deploy to Supabase (replace YOUR_PROJECT_ID)
cd supabase
npx supabase functions deploy inject-insight --project-ref YOUR_PROJECT_ID

# Set required secrets
npx supabase secrets set --project-ref YOUR_PROJECT_ID \
  OPENAI_API_KEY=your_key_here
```

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Endpoints

### POST /functions/v1/inject-insight
Request:
```json
{
  "userId": "uuid",
  "courseId": "uuid",
  "currentTime": 120,
  "autonomyLevel": 1,
  "wrongAnswerStreak": 0
}
```

Response:
```json
{
  "type": "MICRO_LESSON",
  "text": "💡 Focus on understanding 'vectors' - it's key to answering the questions.",
  "timestamp": 120,
  "metadata": {
    "source": "concept_focus",
    "confidence": 0.9,
    "conceptsRelated": ["vectors"]
  }
}
```

## Testing

### Manual Testing
1. Set autonomy level to 2 (Guide Me)
2. Answer 2 questions incorrectly
3. Verify immediate hint appears
4. Check 45-second cooldown works
5. Test timestamp navigation from hint

### Monitoring
- Check `learner_events` table for event tracking
- Monitor `user_hint_cooldowns` for cooldown functionality
- Review edge function logs for hint generation patterns

## Future Enhancements

1. **Personalization**
   - Learn from individual learner patterns
   - Adjust hint timing based on performance

2. **Content Quality**
   - Use GPT-4 for more sophisticated hints
   - A/B test different hint styles

3. **Analytics Dashboard**
   - Hint effectiveness metrics
   - Learner engagement patterns
   - Optimal autonomy level recommendations

## Troubleshooting

### Common Issues

1. **No hints appearing**
   - Check autonomy level (not 0)
   - Verify user is authenticated
   - Check browser console for errors

2. **Too many hints**
   - Cooldown table may need cleanup
   - Check if multiple tabs are polling

3. **Hints not contextual**
   - Verify transcript segments exist
   - Check timestamp calculations
   - Review edge function logs

### Debug Mode
Enable debug logging:
```javascript
// In useInfoBite hook
console.log('InfoBite poll:', { autonomyLevel, isPlaying, currentTime });

// In edge function
console.log('Hint generation context:', { segments, concepts });
```