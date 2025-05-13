const DEFAULT_MAX_LOG_CONTENT_LENGTH = 10240; // 10 KB

/**
 * Truncates a string to a maximum length, appending a suffix if truncated.
 * @param text The text to truncate.
 * @param maxLength The maximum length of the returned string.
 * @param suffix The suffix to append if truncation occurs (e.g., '... [truncated]').
 * @returns The original string or the truncated string.
 */
export const truncateText = (
  text: string | undefined | null,
  maxLength: number = DEFAULT_MAX_LOG_CONTENT_LENGTH,
  suffix: string = '... [truncated]'
): string | undefined => {
  if (!text) {
    return undefined;
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}; 