#!/bin/bash

echo "🚀 CourseForge AI - Full Pipeline Setup"
echo "======================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
# CourseForge AI Environment Configuration
# ========================================

# Supabase Configuration (Required for full pipeline)
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Gemini API Configuration (Required for AI processing)
GEMINI_API_KEY=your_gemini_api_key_here

# NextJS Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Optional: Development Configuration
NODE_ENV=development
EOF
    echo "✅ Created .env.local template"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📋 Configuration Steps:"
echo "1. Get your Supabase URL and Anon Key from: https://app.supabase.com/project/_/settings/api"
echo "2. Get your Gemini API Key from: https://aistudio.google.com/app/apikey"
echo "3. Edit .env.local and replace the placeholder values"
echo "4. Apply the database migration:"
echo "   npm run migration:apply"
echo "5. Test the full pipeline:"
echo "   npm run test:full-pipeline"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI is installed"
    
    # Check if project is linked
    if [ -f "supabase/.temp/project-ref" ]; then
        echo "✅ Supabase project is linked"
    else
        echo "⚠️  Supabase project not linked. Run: supabase link"
    fi
else
    echo "⚠️  Supabase CLI not installed. Install with: npm install -g supabase"
fi

echo ""
echo "🎯 Services Status:"
echo "- enhanced-quiz-service: Deployed (81.7kB)"
echo "- visual-frame-service: Deployed (84.77kB)" 
echo "- frame-capture-service: Deployed (81.34kB)"
echo ""
echo "🧪 Available Test Commands:"
echo "- npm run demo:targeted-visual (local demo)"
echo "- npm run test:full-pipeline (full pipeline with YouTube video)"
echo "- npm run test:visual-integration (service integration test)"
echo ""
echo "🔗 Test URL: https://www.youtube.com/watch?v=LNpoRSuPwfM&pp=0gcJCcEJAYcqIYzv"
echo ""
echo "✨ Once configured, the full pipeline will:"
echo "   1. Create a course from the YouTube video"
echo "   2. Generate enhanced questions with Gemini AI"
echo "   3. Identify visual moments with timestamps"
echo "   4. Extract frames at specific timestamps"
echo "   5. Use Gemini Vision for object detection"
echo "   6. Generate interactive hotspot/matching questions"
echo "   7. Store everything in the database"
echo "" 