# Unified Question Storage Solution

## Overview

This document describes the unified question storage solution implemented to ensure consistent handling of the `correct_answer` field across both segmented and non-segmented video processing paths.

## Problem

The application was experiencing inconsistent storage of the `correct_answer` field:
- The database column is defined as `text` type
- Both segmented and non-segmented paths were storing values differently
- The frontend was having difficulty interpreting the correct answer values

## Solution

### 1. Unified Storage Utility

Created `supabase/functions/quiz-generation-v5/utils/question-storage.ts` with:

- **`transformQuestionForDatabase()`** - Consistent transformation of questions for database storage
- **`extractBoundingBoxes()`** - Unified extraction of bounding boxes for hotspot questions
- **`debugQuestionTransformation()`** - Debug logging for transformation issues

Key features:
- Handles both `true_false` and `true-false` type variants
- Consistent boolean to index conversion for true/false questions (true → 0, false → 1)
- Proper handling of all question types (MCQ, hotspot, matching, sequencing)
- Support for both segmented and non-segmented processing paths

### 2. Frontend Helper Functions

Created `src/utils/questionHelpers.ts` with:

- **`parseCorrectAnswer()`** - Parses the correct_answer field from the database
- **`formatCorrectAnswer()`** - Formats the correct answer for display
- **`isAnswerCorrect()`** - Validates user answers
- **`getCorrectOptionText()`** - Gets the correct option text for a question

These functions handle the text values coming from the database and ensure consistent interpretation across the application.

### 3. Updated Components

- **QuestionOverlay** - Updated to use `parseCorrectAnswer()` helper
- **Backend Functions** - Both paths now use the unified storage utility

## Implementation Details

### Type Conversion Logic

For true/false questions:
- Boolean `true` → 0 (index of 'True' in options array)
- Boolean `false` → 1 (index of 'False' in options array)
- String "true" → 0
- String "false" → 1
- Numeric strings are parsed as integers

For other question types:
- Multiple choice: 0-based index of correct option
- Hotspot/Matching/Sequencing: Always 1 (uses metadata for details)

### Database Considerations

While the `correct_answer` column remains as `text` type in the database:
- All new questions store numeric values as strings
- The frontend helpers properly parse these values
- No data migration is required

## Benefits

1. **Consistency** - Both processing paths use identical storage logic
2. **Reliability** - Frontend correctly interprets all answer formats
3. **Maintainability** - Single source of truth for question transformation
4. **Backward Compatibility** - Handles legacy data formats

## Future Considerations

If a database migration is desired in the future, a migration script has been prepared (but not applied) that would:
1. Convert the `correct_answer` column from text to integer
2. Handle all existing data format variations
3. Add appropriate constraints for data validation

For now, the application layer solution provides a robust and safe approach without requiring database downtime or data migration risks. 