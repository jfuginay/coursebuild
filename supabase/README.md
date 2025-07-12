# CourseBuild - Supabase Edge Functions

This directory contains the Supabase edge functions for the CourseBuild project, including the sophisticated video analysis and quiz generation system.

## 🎯 **Overview**

### **Current Edge Functions:**
- **`gemini-quiz-service`**: Advanced video analysis and quiz generation using Gemini 2.5 Flash

## 🚀 **Quick Deployment**

### **Deploy from Cursor:**
```bash
# Deploy the gemini-quiz-service function
npm run supabase:deploy:gemini

# Or deploy manually
npx supabase functions deploy gemini-quiz-service --project-ref YOUR_PROJECT_REF
```

### **View logs:**
```bash
# Monitor function logs
npm run supabase:logs

# Or manually
npx supabase functions logs gemini-quiz-service --project-ref YOUR_PROJECT_REF
```

## 📁 **Project Structure**

```
supabase/
├── config.toml                           # Supabase configuration
├── functions/
│   └── gemini-quiz-service/
│       ├── index.ts                      # Main function implementation
│       └── deno.json                     # Deno configuration
└── README.md                             # This file
```

## 🔧 **gemini-quiz-service Function**

### **Capabilities:**
- ✅ **Direct Video Analysis** - Uses Gemini 2.5 Flash to analyze YouTube videos
- ✅ **Visual Context Extraction** - Captures on-screen elements, diagrams, demonstrations
- ✅ **Multi-format Questions** - MCQ, True/False, Hotspot questions
- ✅ **Timestamp Accuracy** - Places questions at precise video moments
- ✅ **Educational Content** - Generates meaningful questions with explanations

### **API Endpoint:**
```
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-quiz-service
```

### **Request Format:**
```json
{
  "course_id": "uuid",
  "youtube_url": "https://www.youtube.com/watch?v=...",
  "max_questions": 10,
  "difficulty_level": "medium",
  "focus_topics": ["optional", "topic", "list"]
}
```

### **Response Format:**
```json
{
  "course_id": "uuid",
  "questions": [
    {
      "id": "question_uuid",
      "timestamp": 120,
      "question": "What is the main concept being explained?",
      "type": "multiple-choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "0",
      "explanation": "The correct answer is A because...",
      "visual_context": "Description of on-screen content",
      "accepted": false
    }
  ]
}
```

## 🛠️ **Development**

### **Prerequisites:**
1. **Supabase CLI** - Use via npx or install globally
2. **Access Token** - Already configured in `.cursor/mcp.json`
3. **Environment Variables** - Set in Supabase dashboard

### **Required Environment Variables (Set in Supabase Dashboard):**
```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### **Local Development:**
```bash
# Start local Supabase (optional for functions development)
npm run supabase:start

# Deploy function for testing
npm run supabase:deploy:gemini

# View function logs
npm run supabase:logs
```

### **Function Development Flow:**
1. **Edit** `supabase/functions/gemini-quiz-service/index.ts`
2. **Deploy** using `npm run supabase:deploy:gemini`
3. **Test** via your Next.js app or direct API calls
4. **Monitor** using `npm run supabase:logs`

## 🎨 **Function Architecture**

### **Technology Stack:**
- **Runtime**: Deno (Supabase Edge Runtime)
- **AI Model**: Google Gemini 2.5 Flash
- **Database**: Supabase PostgreSQL
- **Language**: TypeScript

### **Key Components:**

#### **1. Video Analysis Pipeline:**
```typescript
// 1. Receive YouTube URL and course metadata
// 2. Initialize Gemini 2.5 Flash model
// 3. Send video content directly to Gemini
// 4. Parse structured JSON response
// 5. Store questions in database
```

#### **2. Question Types Supported:**
- **MCQ (Multiple Choice)**: 4 options with explanations
- **True/False**: Binary questions with context
- **Hotspot**: Visual element identification

#### **3. Database Integration:**
- **Tables**: `courses`, `questions`
- **Relationships**: Foreign key constraints
- **Validation**: Type checking and data sanitization

## 📊 **Performance Metrics**

### **Current Benchmarks:**
- **Processing Time**: ~2-5 minutes per video
- **Question Quality**: High educational value
- **Visual Analysis**: Advanced frame understanding
- **Accuracy**: Timestamp-precise question placement

### **Scalability:**
- **Concurrent Processing**: Handled by Supabase Edge Runtime
- **Rate Limiting**: Managed by Gemini API quotas
- **Error Handling**: Comprehensive with fallbacks

## 🔐 **Security & Access**

### **Authentication:**
- **JWT Verification**: `verify_jwt = true`
- **CORS Headers**: Configured for web access
- **Environment Variables**: Secure secret management

### **Database Access:**
- **Service Role Key**: Full database access for function
- **Row Level Security**: Implemented on database level
- **Input Validation**: SQL injection prevention

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. Deployment Fails:**
```bash
# Check authentication
npx supabase login --token YOUR_ACCESS_TOKEN

# Verify project reference
npx supabase functions deploy gemini-quiz-service --project-ref YOUR_PROJECT_REF
```

#### **2. Function Errors:**
```bash
# Check logs for detailed error messages
npm run supabase:logs

# Verify environment variables in Supabase dashboard
```

#### **3. Database Connection Issues:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check database table existence: `courses`, `questions`
- Ensure proper table relationships

### **Debug Mode:**
```bash
# Deploy with verbose logging
npx supabase functions deploy gemini-quiz-service --debug
```

## 📈 **Future Enhancements**

### **Planned Features:**
1. **Batch Processing** - Multiple video analysis
2. **Custom Prompts** - Instructor-defined question types
3. **Quality Scoring** - AI-based question assessment
4. **Multi-language** - International video support

### **Performance Optimizations:**
1. **Caching** - Repeated video analysis
2. **Streaming** - Real-time question generation
3. **Load Balancing** - Multiple function instances

## 🔗 **Related Resources**

- **Supabase Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
- **Function Logs**: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
- **Gemini API Docs**: https://developers.generativeai.google/docs
- **Deno Documentation**: https://deno.land/manual

---

## 💡 **Development Notes**

This edge function represents a production-ready implementation of advanced AI video analysis. The system is already more sophisticated than initially planned, featuring:

- **Direct video input** to Gemini (not just transcripts)
- **Visual context awareness** for frame-specific questions
- **Educational quality** focus with meaningful explanations
- **Robust error handling** and logging
- **Scalable architecture** for production use

The implementation showcases cutting-edge AI capabilities for educational content generation and serves as a foundation for the CourseBuild platform. 