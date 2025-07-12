# Enhanced Recommendations Deployment Checklist

This checklist covers all the database and infrastructure changes needed to deploy the enhanced recommendations system.

## Current Status: ✅ FULLY DEPLOYED (Algorithm v4.1)

## 1. Database Migration

### Migration File
- **File**: `supabase/migrations/009_add_chat_insights_and_learning_profiles.sql`
- **Purpose**: Creates tables and infrastructure for the enhanced recommendations system

### Tables Created
1. **`chat_insights`** - Stores extracted insights from AI chat conversations
   - Tracks struggling concepts, learning preferences, interests
   - Indexed for performance on user_id, course_id, session_id, type
   - Row Level Security enabled

2. **`user_learning_profiles`** - Aggregated learning profiles
   - Learning style preferences (visual, sequential, etc.)
   - Topic interests and difficulty preferences  
   - Struggling and mastered concepts
   - Profile confidence score

3. **`recommendation_history`** - Track recommendations and effectiveness
   - Stores recommended courses with metadata
   - Tracks context (trigger, user state)
   - Performance snapshot at recommendation time
   - Allows for effectiveness analysis

### Views Created
- `user_learning_summary` - Comprehensive view joining profiles with recent insights

### Functions Created
- `merge_learning_profile()` - Weighted merging of new insights
- `update_recommendation_effectiveness()` - Track which recommendations were clicked

## 2. Edge Functions to Deploy

### enhanced-recommendations (v4.1)
**Purpose**: Generate personalized YouTube video recommendations

**Key Features**:
- Automatic profile initialization for new users
- Enhanced wrong question analysis with full option display
- Fetches wrong questions from current course with answer details
- Searches real YouTube videos via SerpAPI
- Filters videos by duration (2-20 minutes max)
- Prioritizes shorter videos (3-15 minutes ideal, <10 min optimal)
- LLM selects best matches based on comprehensive user analysis
- Full LangSmith monitoring with descriptive names

**Command**: 
```bash
npx supabase functions deploy enhanced-recommendations
```

### ai-chat-assistant (v4.1)
**Purpose**: Chat assistant with insight extraction and dynamic profile updates

**Updates Made**:
- Added insight extraction module with performance verification
- Extracts 9 types of insights from conversations
- Updates user profiles with weighted merging (15-35% based on maturity)
- Zero hardcoded patterns - pure LLM analysis
- Cross-references insights with actual quiz performance
- Visual diagram generation capabilities

**Command**:
```bash
npx supabase functions deploy ai-chat-assistant
```

### initialize-learning-profile (NEW in v4.1)
**Purpose**: Create comprehensive profiles from existing user data

**Key Features**:
- Analyzes course enrollment and completion history
- Examines question response patterns by type
- Extracts session behavior and time preferences
- Identifies struggling vs mastered concepts
- Sets initial profile confidence scores
- All analysis done by GPT-4o-mini without assumptions

**Command**:
```bash
npx supabase functions deploy initialize-learning-profile
```

## 3. Environment Variables Required

Add these to your Supabase project:

```bash
# For YouTube search
SERPAPI_API_KEY=your_serpapi_key

# For LangSmith monitoring  
LANGSMITH_API_KEY=your_langsmith_key

# Already configured (verify they exist)
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

## 4. Frontend Status

### ✅ Already Updated
- `/api/course/suggestions.ts` - Routes to enhanced recommendations for logged-in users
- `/api/chat.ts` - Passes userId for insight extraction
- `ChatBubble.tsx` - Sends authorization header
- Course page - Shows reasoning in Next Course Modal

### 🔄 No Further Changes Needed
The frontend is fully integrated and ready to use enhanced recommendations

## 5. Migration Steps

1. **Run the database migration**:
   ```bash
   npx supabase db push
   ```

2. **Verify tables were created**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('chat_insights', 'user_learning_profiles', 'recommendation_history');
   ```

3. **Deploy edge functions** (all three):
   ```bash
   npx supabase functions deploy enhanced-recommendations
   npx supabase functions deploy ai-chat-assistant
   npx supabase functions deploy initialize-learning-profile
   ```

4. **Set environment variables** in Supabase dashboard

5. **Test the system**:
   ```bash
   node scripts/test-enhanced-recommendations.js
   ```

## 6. Rollback Plan

If issues arise:

1. **Disable enhanced recommendations**:
   - The system automatically falls back to basic recommendations for anonymous users
   - No code changes needed

2. **Remove migration** (if needed):
   ```sql
   DROP TABLE IF EXISTS recommendation_history CASCADE;
   DROP TABLE IF EXISTS user_learning_profiles CASCADE;
   DROP TABLE IF EXISTS chat_insights CASCADE;
   DROP VIEW IF EXISTS user_learning_summary CASCADE;
   DROP FUNCTION IF EXISTS merge_learning_profile CASCADE;
   DROP FUNCTION IF EXISTS update_recommendation_effectiveness CASCADE;
   ```

## 7. Monitoring

### LangSmith Dashboard
- Project: `enhanced-recommendations`
- Monitor: Token usage, latency, errors
- Track: Search term quality, selection reasoning

### Database Queries
```sql
-- Check insight extraction
SELECT COUNT(*), insight_type 
FROM chat_insights 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY insight_type;

-- Check recommendations
SELECT COUNT(*) 
FROM recommendation_history 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Version History
- **v3.0**: Initial implementation with YouTube integration
- **v3.1**: Added duration filtering (max 20 min) and preference for shorter videos
- **v4.0**: Complete rewrite with AI-driven profiles and chat insights
- **v4.1**: Added profile initialization, enhanced wrong answer analysis, dynamic updates 