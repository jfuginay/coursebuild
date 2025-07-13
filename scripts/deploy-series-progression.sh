#!/bin/bash

# Deploy Enhanced Recommendations with Series Progression Support
# This script deploys the updated enhanced-recommendations edge function

echo "🚀 Deploying Enhanced Recommendations with Series Progression Support..."
echo "=================================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Get project ID from environment or prompt
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "Enter your Supabase project ID:"
    read -r SUPABASE_PROJECT_ID
fi

echo "📦 Deploying enhanced-recommendations function..."
cd supabase || exit

# Deploy the function
npx supabase functions deploy enhanced-recommendations --project-ref "$SUPABASE_PROJECT_ID"

if [ $? -eq 0 ]; then
    echo "✅ Enhanced recommendations function deployed successfully!"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

cd ..

echo ""
echo "🧪 Testing the deployment..."
echo "You can test the new functionality using:"
echo "   node scripts/test-series-progression-recommendations.js"
echo ""
echo "📋 New Features Deployed:"
echo "   ✓ Series detection (Part X, Episode Y, Chapter Z)"
echo "   ✓ Performance-based progression (>80%, 50-80%, <50%)"
echo "   ✓ Natural topic flow for non-series videos"
echo "   ✓ Progression type categorization"
echo "   ✓ Smart search term generation"
echo ""
echo "🎉 Deployment complete!" 