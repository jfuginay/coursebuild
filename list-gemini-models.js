#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Script to list all available Gemini API models
 * Uses the listModels API endpoint to get current model information
 */

// Try to load API key from various sources
function getApiKey() {
  // Check environment variable
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  
  // Try to load from .env.local file
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  
  console.error('❌ GEMINI_API_KEY not found. Please set it in environment or .env.local file');
  console.error('   Get your API key from: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

function makeRequest(apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function listGeminiModels() {
  console.log('🔍 Fetching available Gemini API models...\n');
  
  try {
    const apiKey = getApiKey();
    console.log('✅ API key found, making request...\n');
    
    const { statusCode, data } = await makeRequest(apiKey);
    
    if (statusCode !== 200) {
      console.error(`❌ API request failed with status: ${statusCode}`);
      console.error('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
    
    if (!data.models || !Array.isArray(data.models)) {
      console.error('❌ Unexpected response format - no models array found');
      console.error('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
    
    console.log(`📋 Found ${data.models.length} available models:\n`);
    
    // Group models by type for better organization
    const modelGroups = {
      'Text Generation': [],
      'Vision': [],
      'Other': []
    };
    
    data.models.forEach(model => {
      const info = {
        name: model.name,
        displayName: model.displayName,
        description: model.description,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
        supportedGenerationMethods: model.supportedGenerationMethods
      };
      
      if (model.name.includes('vision') || model.description?.toLowerCase().includes('vision')) {
        modelGroups['Vision'].push(info);
      } else if (model.supportedGenerationMethods?.includes('generateContent')) {
        modelGroups['Text Generation'].push(info);
      } else {
        modelGroups['Other'].push(info);
      }
    });
    
    // Display models by category
    Object.entries(modelGroups).forEach(([category, models]) => {
      if (models.length > 0) {
        console.log(`\n🔸 ${category} Models (${models.length}):`);
        console.log('=' .repeat(50));
        
        models.forEach(model => {
          console.log(`\n📍 ${model.displayName || model.name}`);
          console.log(`   Model Name: ${model.name}`);
          if (model.description) {
            console.log(`   Description: ${model.description}`);
          }
          console.log(`   Input Token Limit: ${model.inputTokenLimit?.toLocaleString() || 'Not specified'}`);
          console.log(`   Output Token Limit: ${model.outputTokenLimit?.toLocaleString() || 'Not specified'}`);
          if (model.supportedGenerationMethods) {
            console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
          }
        });
      }
    });
    
    // Summary for CourseForge AI usage
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY FOR COURSEFORGE AI USAGE:');
    console.log('='.repeat(70));
    
    const textModels = modelGroups['Text Generation'];
    const visionModels = modelGroups['Vision'];
    
    console.log(`\n✅ Text Generation Models: ${textModels.length} available`);
    if (textModels.length > 0) {
      console.log('   Recommended for: MCQ, True/False, Matching, Sequencing questions');
      console.log('   Current usage: quiz-generation-v4 (fallback provider)');
    }
    
    console.log(`\n✅ Vision Models: ${visionModels.length} available`);
    if (visionModels.length > 0) {
      console.log('   Recommended for: Hotspot questions with bounding box detection');
      console.log('   Current usage: quiz-generation-v4 (primary for visual questions)');
    }
    
    // Find currently used models
    const currentModels = {
      'gemini-2.5-flash': textModels.find(m => m.name.includes('gemini-2.5-flash')),
      'gemini-pro': textModels.find(m => m.name.includes('gemini-pro'))
    };
    
    console.log('\n🎯 MODELS CURRENTLY USED IN PROJECT:');
    Object.entries(currentModels).forEach(([modelName, modelInfo]) => {
      if (modelInfo) {
        console.log(`   ✅ ${modelName} - Available`);
      } else {
        console.log(`   ⚠️  ${modelName} - May need to check exact model name`);
      }
    });
    
    console.log('\n💡 TIP: Use this information to optimize model selection in:');
    console.log('   - supabase/functions/quiz-generation-v4/processors/llm-providers.ts');
    console.log('   - supabase/functions/enhanced-quiz-service/index.ts');
    console.log('   - supabase/functions/gemini-quiz-service/index.ts');
    
  } catch (error) {
    console.error('❌ Error fetching models:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  listGeminiModels();
}

module.exports = { listGeminiModels }; 