/**
 * Timestamp Conversion Utilities
 * 
 * Handles conversion between different timestamp formats:
 * - Gemini's base-60 timestamp format (where 100 = 1:00 = 60 seconds)
 * - Standard seconds format (already in seconds, no conversion needed)
 * - String timestamps ("MM:SS" or "H:MM:SS")
 * - Decimal minute format (3.37 = 3 minutes 37 seconds)
 */

/**
 * Convert various timestamp formats to seconds
 * 
 * Format detection logic:
 * - Values >= 100: Likely base-60 format (e.g., 130 = 1:30)
 * - Values < 10 with decimals where decimal*100 < 60: Decimal minute format (e.g., 3.37 = 3:37)
 * - All other numeric values: Already in seconds (no conversion needed)
 * 
 * Examples:
 * - 59 → 59 seconds (no conversion)
 * - 106.582 → 106.582 seconds (no conversion - already in seconds)
 * - 248.332 → 248.332 seconds (no conversion - already in seconds)
 * - 100 → 60 seconds (base-60: 1:00)
 * - 130 → 90 seconds (base-60: 1:30)
 * - 200 → 120 seconds (base-60: 2:00)
 * - 3.37 → 217 seconds (decimal minute: 3m 37s)
 * - "3:37" → 217 seconds (string format)
 */
export const convertBase60ToSeconds = (base60Timestamp: number | string): number => {
  // Handle string timestamps (e.g., "3:37" format)
  if (typeof base60Timestamp === 'string') {
    // Check for "MM:SS" or "H:MM:SS" format
    const parts = base60Timestamp.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    // If not in expected format, try to parse as number
    base60Timestamp = parseFloat(base60Timestamp);
  }
  
  // For values >= 100, check if it's base-60 format
  if (base60Timestamp >= 100) {
  const integerPart = Math.floor(base60Timestamp);
  const fractionalPart = base60Timestamp - integerPart;
  
  // Extract minutes and seconds from integer part
  const minutes = Math.floor(integerPart / 100);
  const seconds = integerPart % 100;
  
    // Validate seconds (should be 0-59 for valid base-60)
    if (seconds < 60) {
      // This is base-60 format
      console.log(`   🔄 Converting base-60 format: ${base60Timestamp} → ${minutes}m ${seconds}s`);
      return minutes * 60 + seconds + fractionalPart;
    } else {
      // Invalid base-60, treat as seconds
      console.log(`   ⚠️ Invalid base-60 format (seconds >= 60): ${base60Timestamp}, treating as seconds`);
      return base60Timestamp;
    }
  }
  
  // For small values, check if it might be decimal minute format
  if (base60Timestamp < 10) {
    const integerPart = Math.floor(base60Timestamp);
    const fractionalPart = base60Timestamp - integerPart;
    
    if (fractionalPart > 0) {
      const possibleSeconds = Math.round(fractionalPart * 100);
      if (possibleSeconds < 60) {
        // Likely decimal minute format: 3.37 = 3 minutes 37 seconds
        console.log(`   🔄 Converting decimal minute format: ${base60Timestamp} → ${integerPart}m ${possibleSeconds}s`);
        return integerPart * 60 + possibleSeconds;
      }
    }
  }
  
  // For all other values (10-99 or values with invalid format), treat as seconds
  // This includes timestamps like 106.582 which are already in seconds
  return base60Timestamp;
};

/**
 * Format seconds for display as HH:MM:SS or MM:SS
 */
export const formatSecondsForDisplay = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Convert an array of timestamps from base-60 to seconds
 */
export const convertTimestampArray = (timestamps: (number | string)[]): number[] => {
  return timestamps.map(ts => convertBase60ToSeconds(ts));
};

/**
 * Convert a timestamp object with multiple timestamp fields
 */
export const convertTimestampObject = <T extends Record<string, any>>(
  obj: T,
  timestampFields: string[]
): T => {
  const converted: any = { ...obj };
  
  for (const field of timestampFields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      if (Array.isArray(obj[field])) {
        converted[field] = convertTimestampArray(obj[field]);
      } else if (typeof obj[field] === 'number' || typeof obj[field] === 'string') {
        converted[field] = convertBase60ToSeconds(obj[field]);
      }
    }
  }
  
  return converted as T;
}; 

/**
 * Convert seconds to MM:SS string format
 * 
 * Examples:
 * - 45 → "0:45"
 * - 90 → "1:30"
 * - 605 → "10:05"
 * - 3661 → "61:01" (for videos longer than 1 hour)
 */
export const convertSecondsToMMSS = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Convert MM:SS string format to seconds
 * 
 * Examples:
 * - "0:45" → 45
 * - "1:30" → 90
 * - "10:05" → 605
 * - "61:01" → 3661
 */
export const convertMMSSToSeconds = (mmss: string): number => {
  const parts = mmss.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid MM:SS format: ${mmss}`);
  }
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds) || seconds >= 60 || seconds < 0) {
    throw new Error(`Invalid MM:SS format: ${mmss}`);
  }
  
  return minutes * 60 + seconds;
}; 