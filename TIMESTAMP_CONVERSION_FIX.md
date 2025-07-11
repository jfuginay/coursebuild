# Timestamp Conversion Fix Summary

## Problem
When processing video segments with Gemini's `startOffset`/`endOffset` parameters, timestamps like 106.582 and 248.332 (which were already in seconds) were being incorrectly interpreted as decimal minute format (106 minutes 58 seconds and 248 minutes 33 seconds).

## Root Cause
The timestamp converter was making assumptions about the format based on the value rather than understanding the context:
- Values < 10 with decimals → assumed decimal minute format (e.g., 3.37 = 3m 37s)
- This incorrectly converted segment timestamps like 106.582 seconds to 106m 58s

## Solution Implemented

### 1. **Added Explicit Format Specification**
- Updated the response schema to include a `timestamp_format` field
- Gemini now explicitly tells us what format it's using:
  - `"seconds"` - Already in seconds (e.g., 106.5)
  - `"base60"` - Gemini's base-60 format (e.g., 130 = 1:30)
  - `"decimal_minutes"` - Minutes.seconds format (e.g., 3.37 = 3m 37s)
  - `"string_mmss"` - String format "MM:SS"
  - `"string_hhmmss"` - String format "HH:MM:SS"

### 2. **Enhanced Timestamp Converter**
- Updated `convertBase60ToSeconds()` to handle different formats more intelligently:
  - Values >= 100: Check if valid base-60 (seconds < 60)
  - Values 10-99: Treat as seconds (no conversion)
  - Values < 10 with decimals: Check for decimal minute format
  - All other values: Already in seconds

### 3. **Format-Aware Conversion**
- Planning stage now uses the `timestamp_format` field from Gemini's response
- If format is `"seconds"`, no conversion is performed
- Otherwise, uses the appropriate conversion logic

## Example
For a segment from 10:00-15:00 (600-900 seconds):
- **Before**: 106.582 → 6398 seconds (106m 58s) ❌
- **After**: 106.582 → 106.582 seconds ✅

## Impact
- Segmented video processing now correctly handles timestamps
- Questions appear at the right time in video segments
- No more impossibly high timestamp values

## Future Considerations
- Gemini typically uses seconds format when processing video segments with startOffset/endOffset
- The explicit format specification ensures we handle any format correctly
- No more guessing - Gemini tells us exactly what format it's using 