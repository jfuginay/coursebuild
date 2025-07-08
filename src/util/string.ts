/**
 * Capitalizes the first letter of each word in a string.
 * @param str The input string to be capitalized.
 * @returns A new string with the first letter of each word capitalized.
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
* Truncates a string to a specified length and adds an ellipsis if truncated.
* @param str The input string to be truncated.
* @param maxLength The maximum length of the truncated string (including ellipsis).
* @returns A truncated string with ellipsis if necessary.
*/
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
      return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
* Removes all whitespace from a string.
* @param str The input string to remove whitespace from.
* @returns A new string with all whitespace removed.
*/
export function removeWhitespace(str: string): string {
  return str.replace(/\s/g, '');
}
