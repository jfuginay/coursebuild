/**
 * Timestamp Conversion Utilities
 * 
 * Handles conversion between Gemini's base-60 timestamp format and standard seconds.
 * Gemini uses a format where 100 = 1:00 = 60 seconds
 */

/**
 * Convert base-60 timestamp format to seconds
 * Examples:
 * - 59 → 59 seconds
 * - 100 → 60 seconds (1:00)
 * - 130 → 90 seconds (1:30)
 * - 200 → 120 seconds (2:00)
 * - 245 → 165 seconds (2:45)
 * - 130.5 → 90.5 seconds (1:30.5)
 */
export const convertBase60ToSeconds = (base60Timestamp: number): number => {
  // Handle floating point timestamps
  const integerPart = Math.floor(base60Timestamp);
  const fractionalPart = base60Timestamp - integerPart;
  
  if (integerPart < 100) {
    // Under 100, it's just seconds
    return base60Timestamp;
  }
  
  // Extract minutes and seconds from integer part
  const minutes = Math.floor(integerPart / 100);
  const seconds = integerPart % 100;
  
  // Validate seconds (should be 0-59)
  if (seconds >= 60) {
    console.warn(`⚠️ Invalid seconds in timestamp ${base60Timestamp}: ${seconds} >= 60, treating as ${seconds}`);
  }
  
  // Convert to total seconds and add fractional part
  return minutes * 60 + seconds + fractionalPart;
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
export const convertTimestampArray = (timestamps: number[]): number[] => {
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
      } else if (typeof obj[field] === 'number') {
        converted[field] = convertBase60ToSeconds(obj[field]);
      }
    }
  }
  
  return converted as T;
}; 