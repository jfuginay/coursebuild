# CourseBuild

CourseBuild is an innovative platform that transforms YouTube videos into comprehensive, interactive online courses using advanced AI and educational design principles. Think of it as "Cursor for Course Creators" - an AI-powered tool that automatically generates structured learning experiences from video content.

## 🎯 Project Overview

CourseBuild leverages dual LLM providers with full video transcription and intelligent question timing to:
- **Full Video Transcript Generation** with visual descriptions and concept timeline
- **Intelligent Question Timing** using LLM-based optimization to place questions after concepts are explained
- **Dual LLM Provider Support** with OpenAI GPT-4o (default for text) and Google Gemini 2.5 Flash (for visual)
- **Enhanced Context Awareness** with transcript-based question generation
- **Educational framework integration** with Bloom's taxonomy and quality control

## ✨ Core Features

### 🧠 **Quiz Generation Pipeline v5.0**
- **Full transcript generation** during planning phase with visual descriptions
- **Base-60 timestamp conversion** handling Gemini's unique timestamp format
- **LLM-optimized question timing** ensuring questions appear after concepts are explained
- **Transcript context extraction** with intelligent segment boundary handling
- **Dynamic frame sampling** based on video duration for optimal performance (NEW)
- **Unified LLM interface** supporting OpenAI GPT-4o and Gemini 2.5 Flash
- **Provider-specific optimization**: OpenAI for text questions (default), Gemini for visual content
- **Automatic fallback system** with health checks and retry logic
- **Segmented processing** for long videos (>10 minutes) with context preservation (NEW)

### 🔧 **Advanced Processing Pipeline**
- **Video Duration Limit**: Maximum 45 minutes per video (clear error messages for longer videos)
- **Enhanced 3-stage processing**: 
  - Stage 1: Full transcript generation + planning with dynamic frame sampling
  - Stage 2: Context-aware question generation with optimal timing
  - Stage 3: Optional quality verification
- **Segmented video processing** for long videos:
  - Automatic splitting into ~5-minute segments
  - Sequential processing with context continuity
  - Progressive transcript building across segments
  - Smart segment boundaries with 5-second buffer
  - **Atomic segment claiming** with unique worker IDs (NEW)
  - **Backend orchestration** for reliable sequential processing (NEW)
  - **Automatic recovery** for stuck segments with 5-minute timeout (NEW)
- **Real-time video analysis** with transcript-aware strategic question placement
- **Intelligent frame sampling** that adapts to video duration (1fps for <5min, scaling down for longer videos)
- **Transcript storage** for reuse and analysis
- **End-to-end pipeline** completing in ~30 seconds with full transcription
- **Data format compatibility** with proper JSON parsing for frontend

### 🎨 **Interactive Visual Components**
- **Enhanced matching questions** with visual connection lines and color coding
- **Hotspot questions** with multiple bounding boxes using transcript visual descriptions  
- **Sequencing questions** with live reordering and logical flow validation
- **Video overlay integration** with LLM-optimized timestamp placement
- **Transcript-aware rendering** supporting contextual question display
- **Complete metadata storage** including all bounding boxes for segmented videos (NEW)

### 🤖 **AI Chat Assistant with Visual Generation**
- **Intelligent Video Context Awareness** with full transcript integration for contextual responses
- **Dynamic Visual Generation** using Mermaid diagrams to enhance learning comprehension
- **Multi-Modal Learning Support** combining text responses with interactive visual content
- **Smart Visual Detection** using pattern matching and LLM analysis to determine when diagrams would benefit learning
- **Five Diagram Types** with specialized generation for different educational contexts:
  - **Flowcharts**: Process flows and decision trees based on video content
  - **Mind Maps**: Concept relationships and hierarchical knowledge structures
  - **Sequence Diagrams**: Step-by-step processes and interactions
  - **Comparison Charts**: Side-by-side analysis of concepts from video
  - **Timelines**: Chronological progression and historical sequences
- **Contextual Title & Description Generation** using LLM to create meaningful, content-specific diagram metadata
- **Interactive Fullscreen Experience** with responsive diagram scaling and robust DOM handling
- **Advanced Error Handling** with detailed debugging, loading states, and fallback mechanisms
- **Export & Sharing Capabilities** including diagram code copying, SVG download, and note-saving functionality
- **LangSmith Integration** for comprehensive API call logging and monitoring of visual generation pipeline

### 🔍 **Fact-Check Feature for Quiz Answers**
- **Web-Powered Verification**: Uses OpenAI Responses API with web search to fact-check quiz answers
- **Answer Comparison**: Compares user's answer against the quiz's expected answer using real-time web data
- **Source Citations**: Provides links to authoritative sources with descriptions for verification
- **Confidence Scoring**: Shows confidence levels (Low/Medium/High) for fact-check results
- **Context-Aware Analysis**: Includes video transcript context for more accurate fact-checking
- **Smart Button Integration**: Fact-check button appears contextually after answering questions
- **Visual Presentation**: Results displayed in distinctive purple cards with structured information
- **Edge Function Architecture**: Deployed as `fact-check-service` Supabase edge function
- **LangSmith Integration**: All API calls logged for monitoring and debugging

#### **Visual Generation Pipeline**
- **Pattern-Based Detection**: Recognizes explicit visual requests ("create a flowchart", "show me a diagram")
- **LLM-Enhanced Analysis**: Uses GPT-4o-mini to analyze complex queries for visual learning opportunities
- **Conservative Generation**: High confidence threshold (0.8) ensures visuals only generated when truly beneficial
- **Context-Rich Prompts**: Passes full video transcript context (up to 5000 chars) for accurate diagram generation
- **Structured Output**: JSON responses with title, description, and Mermaid code for consistent frontend rendering
- **Robust Fallback**: Multiple error recovery mechanisms with detailed logging for troubleshooting

#### **Frontend Visual Components**
- **VisualChatMessage Component**: Advanced React component for rendering chat messages with embedded diagrams
- **Real-time Mermaid Rendering**: Dynamic SVG generation with responsive sizing and fullscreen capabilities
- **Interactive Modal System**: Fullscreen diagram viewing with polling-based DOM readiness detection
- **Loading States**: Professional spinner animations and status indicators during diagram generation
- **Error Recovery**: Graceful error display with debug information and retry mechanisms
- **Export Integration**: One-click copying, downloading, and note-saving functionality

### 📊 **Quality Assurance & Monitoring**
- **Comprehensive error recovery** with multi-provider fallback
- **Token usage tracking** and cost optimization
- **Transcript-based validation** ensuring questions align with video content
- **Enhanced JSON parsing** for large transcript responses
- **Performance monitoring** with detailed metrics and health checks
- **LangSmith integration** for API call tracing and debugging

## 🛠️ Technical Stack

- **Frontend**: Next.js with Pages Router, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Supabase Edge Functions (Deno runtime)
- **AI Services**: 
  - **OpenAI GPT-4o** (2024-08-06) with structured outputs for text questions (default)
  - **Google Gemini 2.5 Flash** with Vision API for visual content and transcription
- **LLM Interface**: Unified provider abstraction with automatic switching
- **Database**: Supabase (PostgreSQL) with transcript storage support
- **Deployment**: Vercel (Frontend) + Supabase Edge Functions
- **Error Handling**: Multi-layer retry logic with JSON fixing capabilities
- **Monitoring**: LangSmith integration for API call tracing and debugging
- **Orchestration**: Backend-only segment processing with atomic claiming

## 📊 Database Schema

### Core Tables

#### **courses**
Primary table for course information.
```sql
- id: uuid (primary key)
- title: text
- description: text
- youtube_url: text
- thumbnail_url: text
- channel_name: text
- duration: integer (seconds)
- published: boolean
- created_at: timestamp
- created_by: uuid (references auth.users)
- is_segmented: boolean
- total_segments: integer
- segment_duration: integer
```

#### **questions**
Stores all quiz questions generated for courses.
```sql
- id: uuid (primary key)
- course_id: uuid (references courses)
- segment_id: uuid (references course_segments)
- timestamp: integer (video timestamp in seconds)
- frame_timestamp: integer (specific frame for visual questions)
- question: text
- type: text (multiple-choice, true-false, hotspot, matching, sequencing)
- options: jsonb (array of options for MCQ)
- correct_answer: integer or jsonb
- explanation: text
- has_visual_asset: boolean
- metadata: jsonb (includes bounding boxes, educational rationale, etc.)
- generation_status: text (planned, generating, completed, failed)
- accepted: boolean
```

#### **video_transcripts** ⚠️
Stores full video transcripts with concept timelines.
```sql
- id: uuid (primary key)
- course_id: uuid (references courses)
- video_url: text
- video_summary: text
- total_duration: integer
- full_transcript: jsonb (array of transcript segments)
- key_concepts_timeline: jsonb (array of concept objects)
- model_used: text
- processing_time_ms: integer
- metadata: jsonb
- created_at: timestamp
```

**⚠️ Important Notes:**
- **One-to-Many Relationship**: A course can have multiple transcripts (e.g., from segmented processing)
- **Join Returns Array**: When joining with courses, `video_transcripts` returns as an array
- **Key Concepts Structure**: `key_concepts_timeline` contains objects like:
  ```json
  {
    "concept": "Black Hole Theory",
    "first_mentioned": 120,
    "explanation_timestamps": [120, 240, 360]
  }
  ```

#### **course_segments**
For videos processed in segments (>10 minutes).
```sql
- id: uuid (primary key)
- course_id: uuid (references courses)
- segment_index: integer
- start_time: integer
- end_time: integer
- title: text
- status: text (pending, processing, completed, failed)
- worker_id: text (for atomic processing)
- planning_status: text
- question_plans_count: integer
- cumulative_key_concepts: jsonb
- retry_count: integer
```

#### **user_learning_profiles**
AI-generated learning profiles for personalized recommendations.
```sql
- user_id: uuid (primary key, references auth.users)
- learning_style: jsonb (preferences with scores 0-1)
- struggling_concepts: jsonb (array with severity scores)
- mastered_concepts: jsonb (array with confidence levels)
- topic_interests: jsonb (map of topics to interest scores)
- preferred_difficulty: jsonb
- engagement_metrics: jsonb
- profile_confidence: float (0-1)
- total_insights_processed: integer
- last_profile_update: timestamp
```

#### **user_question_responses**
Tracks user answers to quiz questions.
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- question_id: uuid (references questions)
- selected_answer: integer (index for MCQ/TF)
- response_text: text (actual answer text or JSON for complex types)
- is_correct: boolean
- time_taken: integer (seconds)
- attempted_at: timestamp
```

#### **user_course_enrollments**
Tracks course viewing and progress.
```sql
- user_id: uuid (references auth.users)
- course_id: uuid (references courses)
- enrolled_at: timestamp
- last_accessed_at: timestamp
- completion_percentage: float (0-100)
- questions_answered: integer
- time_spent_seconds: integer
- PRIMARY KEY (user_id, course_id)
```

#### **chat_insights**
Stores insights extracted from AI chat interactions.
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- course_id: uuid (references courses)
- session_id: text
- message_id: text
- insight_type: text
- insight_content: jsonb
- confidence_score: float
- extracted_concepts: text[]
- extracted_topics: text[]
- sentiment_score: float
- created_at: timestamp
```

#### **recommendation_history**
Tracks AI-generated course recommendations.
```sql
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- recommended_courses: jsonb (array of recommendations)
- recommendation_context: jsonb
- insights_snapshot: jsonb
- performance_snapshot: jsonb
- created_at: timestamp
```

## 🚀 Getting Started

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Add your API keys: GEMINI_API_KEY, OPENAI_API_KEY, SUPABASE_URL, etc.
   ```
4. Run the development server:
   ```bash
   pnpm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) to see the application

## 🚀 Deployment Status

✅ **Production Ready**: Deployment pipeline optimized with ESLint/TypeScript build configurations  
✅ **Visual Quiz System**: Complete backend implementation with hotspot, matching, and sequencing questions  
✅ **Transcript Integration**: Real-time video transcript display with synchronization  
✅ **Team Feedback**: 8 UX improvement items tracked in GitHub issues (#95-#103)


## 🚀 Deployment

### Current Production Status ✅

| Component | Status | Version | Features |
|-----------|--------|---------|----------|
| **Quiz Generation v5.0** | ✅ Live | Latest | Full transcript, LLM timing, base-60 conversion |
| **AI Chat Assistant** | ✅ Live | Latest | Visual diagram generation, context-aware responses |
| **Transcript Generation** | ✅ Production | - | Complete video analysis with visual descriptions |
| **Timestamp Optimization** | ✅ Active | - | LLM-based placement after concepts explained |
| **Database Schema** | ✅ Updated | - | Transcript storage and enhanced metrics |
| **Segmented Processing** | ✅ Active | - | Atomic claiming with backend orchestration |
| **LLM Providers** | ✅ Updated | - | OpenAI default for text, Gemini for visual |

### Supabase Edge Functions

The backend processing is powered by Quiz Generation v5.0 with advanced transcript-aware generation:

- **`quiz-generation-v5`**: Main pipeline with full transcript generation and LLM timing
- **`ai-chat-assistant`**: Intelligent chat assistant with visual diagram generation using Mermaid
- **`course-suggestions`**: AI-powered course continuation recommendations
- **`orchestrate-segment-processing`**: Backend orchestrator for reliable segment sequencing
- **`process-video-segment`**: Individual segment processor with atomic claiming

#### Quick Deployment Commands:
```bash
# Deploy Quiz Generation v5.0
cd supabase && npx supabase functions deploy quiz-generation-v5 --project-ref YOUR_PROJECT_ID

# Deploy AI Chat Assistant
npx supabase functions deploy ai-chat-assistant --project-ref YOUR_PROJECT_ID

# Deploy Orchestrator
npx supabase functions deploy orchestrate-segment-processing --project-ref YOUR_PROJECT_ID

# Monitor function logs  
npx supabase functions logs quiz-generation-v5 --project-ref YOUR_PROJECT_ID --tail

# Test the pipeline
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/quiz-generation-v5 \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"course_id": "test", "youtube_url": "https://youtube.com/watch?v=...", "max_questions": 4}'
```

## 🎓 Quiz Generation v5.0 - **PRODUCTION READY**

#### **1. Full Video Transcript Generation**
- **Complete Transcription**: Full video transcript with visual descriptions
- **Key Concepts Timeline**: Tracking when concepts are introduced
- **Visual Description Integration**: Scene descriptions for visual questions
- **Database Storage**: Transcripts saved for reuse and analysis

#### **2. Intelligent Timestamp Management**
- **Base-60 Conversion**: Proper handling of Gemini's timestamp format (100 = 1:00 = 60s)
- **LLM-Based Optimization**: Questions placed after concepts are fully explained
- **Segment Boundary Intelligence**: Auto-fill missing end_timestamps
- **Context Window Extraction**: ±30 second windows with relevant segments

#### **3. Enhanced Context-Aware Generation**
- **Transcript Context Passing**: All processors receive relevant transcript segments
- **Optimal Timestamp Field**: LLM determines best placement for each question
- **Visual Description Usage**: Hotspot questions use transcript visual descriptions
- **Concept Alignment**: Questions aligned with key concepts timeline

#### **4. Robust Error Handling**
- **Large Response Handling**: Enhanced JSON parsing for 30KB+ responses
- **Token Limit Management**: Adjusted limits to prevent truncation
- **JSON Fixing Attempts**: Recovery from malformed JSON responses
- **Comprehensive Logging**: Detailed error context and response previews


## 🚀 Recent Updates

### January 2025 - Major Architecture Improvements

#### Fact-Check Feature for Quiz Answers (NEW)
- **Web-Powered Answer Verification**: Implemented fact-checking using OpenAI Responses API with web search
  - Compares user's answer against quiz's expected answer using real-time web data
  - Provides authoritative source citations with clickable links
  - Shows confidence levels (Low/Medium/High) for verification results
- **Smart UI Integration**: Context-aware button that changes based on user state:
  - Video watching: Blue "Explain this part of the video" button
  - Question shown: Orange "Get a hint for this question" button  
  - Answer submitted: Purple "Fact check the answer" button
- **Answer Comparison Logic**: Enhanced to show both answers side-by-side:
  - Displays user's selected answer and quiz's expected answer
  - Provides individual evaluation for each answer
  - Handles all question types (multiple choice, true/false, etc.)
- **Bug Fixes**: 
  - Fixed "0" display for multiple choice answers by handling string/number answer formats
  - Fixed true/false evaluation to correctly identify when "False" is the right answer
- **Technical Implementation**:
  - New `fact-check-service` Supabase edge function
  - `FactCheckMessage` React component for result display
  - LangSmith integration for API monitoring

#### Series Progression & Natural Learning Path (NEW)
- **Intelligent Series Detection**: Automatically identifies video series (Part X, Episode Y, Chapter Z patterns)
- **Performance-Based Progression**: 
  - High performers (>80%) advance to next episode/advanced topics
  - Medium performers (50-80%) get balanced progression + reinforcement
  - Low performers (<50%) receive prerequisites and review content
- **Natural Topic Flow**: Even non-series videos follow logical learning progressions
- **Progression Types**: Each recommendation categorized as:
  - `series_continuation`: Next in series
  - `topic_advancement`: Natural next step
  - `reinforcement`: Strengthen understanding
  - `prerequisite`: Foundational content
- **Smart Search Terms**: Generates series-specific searches with variations
- **Adaptive Difficulty**: Content matches user's demonstrated ability
- **See [SERIES_PROGRESSION_RECOMMENDATIONS.md](docs/SERIES_PROGRESSION_RECOMMENDATIONS.md) for details**


## 📋 Documentation & Resources

### Technical Documentation
- **[COURSE_GENERATION_PIPELINE.md](COURSE_GENERATION_PIPELINE.md)**: Complete v5.0 technical reference with transcript integration
- **[SEGMENTED_PROCESSING_ARCHITECTURE.md](SEGMENTED_PROCESSING_ARCHITECTURE.md)**: Detailed atomic processing architecture
- **[supabase/functions/quiz-generation-v5/README.md](supabase/functions/quiz-generation-v5/README.md)**: v5 implementation details

## 🏗️ Project Structure

- `src/pages/`: Application pages with enhanced question routing
- `src/components/`: React components with transcript-aware rendering
- `src/components/visual/`: Advanced visual question components
- `src/lib/`: Core libraries and API integrations
- `supabase/`: Edge functions and database configuration
  - `functions/quiz-generation-v5/`: Main pipeline with transcript generation
  - `functions/orchestrate-segment-processing/`: Backend orchestrator
  - `processors/`: LLM providers with transcript context support
  - `utils/`: Transcript utilities and timestamp conversion
  - `migrations/`: Database schema with transcript storage
- `test-*.js`: Comprehensive test suites for v5.0 pipeline

## 👥 Contributors
- **Alan** - [@alanliDR](https://x.com/alanliDR)
- **Roosh** - [@rooshonline](https://x.com/rooshonline)
- **Yash** - [@yashchitneni](https://x.com/yashchitneni)
- **J Wylie** - [@Jfuginay](https://x.com/Jfuginay)

---

*CourseBuild v5.0 - Advanced video-to-course transformation with full transcript generation, intelligent question timing, and enhanced educational context awareness.*
