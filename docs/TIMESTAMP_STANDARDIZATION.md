# Timestamp Standardization: MM:SS Format

## Overview

We have standardized all timestamp communication with Gemini to use the MM:SS string format. This eliminates confusion from various numeric formats and ensures consistent timestamp handling throughout the application.

## Changes Made

### 1. Prompts Configuration (`config/prompts.ts`)

**Updated Requirements:**
- Added explicit instruction for MM:SS format in transcription requirements
- Changed `timestamp_format` enum to only accept `"mm:ss"`
- Updated schema to use string type for all timestamp fields

**Key Changes:**
```typescript
// Schema now specifies:
timestamp_format: {
  type: "string",
  enum: ["mm:ss"],
  description: "Format of all timestamps in this response. Must be 'mm:ss' format"
}

// All timestamp fields are now strings:
timestamp: { 
  type: "string", 
  description: "Start time in MM:SS format (e.g., '1:30')" 
}
```

### 2. Planning Stage (`stages/planning.ts`)

**Video Metadata Updates:**
- `startOffset` and `endOffset` use seconds format with 's' suffix (required by Gemini API)
- Note: Gemini API requires duration format (e.g., "300s" not "5:00")

**Example:**
```typescript
// Format:
startOffset: `${segmentInfo.startTime}s`
endOffset: `${bufferedEndTime}s`
```

**Timestamp Conversion:**
- Default format changed from `'base60'` to `'mm:ss'`
- Added MM:SS handling in `convertTimestamp` function

### 3. Timestamp Converter (`utils/timestamp-converter.ts`)

**New Functions Added:**
```typescript
// Convert seconds to MM:SS format
convertSecondsToMMSS(seconds: number): string
// Examples: 45 → "0:45", 90 → "1:30", 605 → "10:05"

// Convert MM:SS format to seconds
convertMMSSToSeconds(mmss: string): number
// Examples: "0:45" → 45, "1:30" → 90, "10:05" → 605
```

### 4. Hotspot Processor (`processors/hotspot-processor.ts`)

**Video Metadata Updates:**
- `startOffset` and `endOffset` use seconds format with 's' suffix (required by Gemini API)
- Added `formatSecondsForDisplay()` for all console logging

**Example:**
```typescript
// Format:
videoMetadata: {
  startOffset: `${startOffset}s`,
  endOffset: `${endOffset}s`
}
```

**Console Logging:**
- All timestamp displays now use `formatSecondsForDisplay()` for consistency
- Debug logs show both human-readable format and MM:SS format being sent

## Format Specification

### MM:SS Format Rules

1. **Format:** `M:SS` or `MM:SS`
   - Minutes can be any number (no leading zero required)
   - Seconds always have 2 digits with leading zero if needed

2. **Examples:**
   - 45 seconds: `"0:45"`
   - 1 minute 30 seconds: `"1:30"`
   - 10 minutes 5 seconds: `"10:05"`
   - 61 minutes 1 second: `"61:01"` (videos > 1 hour)

3. **No Hours:** Even for videos longer than 1 hour, we use total minutes
   - 1 hour 5 minutes: `"65:00"` (not "1:05:00")

## Benefits

1. **Clarity:** No confusion between decimal minutes (3.37) and seconds (337)
2. **Consistency:** Single format for all timestamps
3. **Human Readable:** MM:SS is universally understood
4. **Gemini Compatible:** Works well with video analysis APIs

## Migration Notes

### For Existing Data

The system still supports legacy formats as fallback:
- `seconds`: Numeric seconds (106.582)
- `base60`: Gemini's old format (130 = 1:30)
- `decimal_minutes`: Minutes with decimal seconds (3.37 = 3m 37s)

### For New Development

Always use MM:SS format when:
1. Sending timestamps to Gemini
2. Requesting timestamps from Gemini
3. Displaying timestamps to users
4. Storing timestamps (convert to seconds for calculations)

## Testing

To verify correct implementation:

1. **Segment Processing:**
   ```
   Input: startTime=300, endTime=605
   Sent to Gemini: startOffset="300s", endOffset="605s"
   ```

2. **Response Handling:**
   ```
   From Gemini: timestamp="3:45"
   Converted: 225 seconds
   Displayed: "3:45"
   ```

## Troubleshooting

### Common Issues

1. **"Invalid MM:SS format" Error**
   - Ensure format is "M:SS" with colon separator
   - Seconds must be 00-59
   - No spaces in the string

2. **Timestamp Mismatch**
   - Check if Gemini returned the expected format
   - Verify `timestamp_format` field is "mm:ss"
   - Look for conversion logs in console

3. **Legacy Data**
   - Old courses may have numeric timestamps
   - Converter handles these automatically
   - No migration needed

## Future Considerations

1. **API Versioning:** Consider API version for format changes
2. **Validation:** Add stricter validation for incoming timestamps
3. **Display Options:** Allow user preference for display format 