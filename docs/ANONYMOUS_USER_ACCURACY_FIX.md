# Anonymous User Accuracy & Question Tracking Fix

## Overview
This fix addresses multiple issues with anonymous user question tracking and display in the enhanced recommendations system:

1. **Incorrect Accuracy Calculation**: User performance was showing as "0%" even when questions were answered correctly
2. **"Option NaN" Display**: Correct answers were showing as "Option NaN" instead of the actual answer text
3. **Missing Explanations**: "Why it matters" was showing as undefined
4. **Empty Key Concepts**: Key concepts were not being captured for anonymous users

## Root Causes

### 1. Incomplete Question Data Tracking
The SessionManager was only storing basic question information without:
- Full explanation text
- Options array (for multiple choice)
- Proper correct answer format

### 2. Incorrect Data Type Handling
The `correct_answer` field was being treated as always numeric, but for anonymous users it was stored as a string (e.g., "True", "False", or the actual answer text).

### 3. Missing Accuracy Calculation
The system was trying to calculate accuracy from wrong questions only, without knowing the total questions attempted.

## Changes Made

### 1. Enhanced Session Tracking (`src/utils/sessionManager.ts`)
- Added `explanation` field to `WrongQuestion` interface
- Updated `trackQuestionResult` method to accept and store explanation
- Maintained backward compatibility with `concept` field

### 2. Course Page Updates (`src/pages/course/[id].tsx`)
- Modified `handleAnswer` to pass `question.explanation` to SessionManager
- Changed from passing `undefined` to passing actual explanation text

### 3. Edge Function Fixes (`supabase/functions/enhanced-recommendations/index.ts`)

#### a. Session Data Interface Update
- Added `explanation` field to `SessionPerformanceData.performance.wrongQuestions`

#### b. Wrong Question Conversion
- Updated `convertSessionWrongQuestions` to include explanation with fallback to concept
- Properly maps `correctAnswer` from session data

#### c. Accuracy Calculation Fix
- Modified `buildFinalSelectionPrompt` to use session data for accuracy calculation
- Added proper handling for anonymous users with total questions from session
- Shows "X mistakes identified" when total questions unknown

#### d. Correct Answer Display Fix
- Enhanced answer text extraction to handle both string and numeric correct_answer values
- Added type checking for `correct_answer` field
- Proper fallback handling for unknown answer formats

## Testing Steps

1. **Test as Anonymous User**:
   ```bash
   # Clear browser data/use incognito mode
   # Navigate to a course
   # Answer some questions (mix of correct and incorrect)
   # Complete the course
   ```

2. **Verify Accuracy Display**:
   - Should show correct percentage (e.g., "67%" not "0%")
   - For logged-in users without total questions, shows "X mistakes identified"

3. **Check Wrong Question Display**:
   - Correct answers should show actual text (e.g., "True" not "Option NaN")
   - Explanations should display properly under "Why it matters"
   - Question types should be handled correctly

4. **Run Test Script**:
   ```bash
   node scripts/test-anonymous-recommendations.js
   ```

## Deployment Steps

1. **Deploy Edge Function**:
   ```bash
   cd supabase
   npx supabase functions deploy enhanced-recommendations --project-ref YOUR_PROJECT_ID
   ```

2. **Clear Browser Cache**:
   - Important for anonymous users to get fresh session tracking

3. **Monitor Logs**:
   ```bash
   npx supabase functions logs enhanced-recommendations --project-ref YOUR_PROJECT_ID --tail
   ```

## Expected Results

### Before Fix:
```
- User Performance: 0% accuracy (2 mistakes out of 2 questions)
- Correct answer: "Option NaN"
- Why it matters: undefined
- Key concepts: (empty)
```

### After Fix:
```
- User Performance: 67% accuracy (1 mistakes out of 3 questions)
- Correct answer: "True" or actual answer text
- Why it matters: [actual explanation text]
- Key concepts: [if available in metadata]
```

## Notes

- Key concepts will remain empty for anonymous users as they're not stored in session data
- Full question metadata (like options array) is not stored for anonymous users to keep session data lightweight
- The fix maintains backward compatibility with existing session data 