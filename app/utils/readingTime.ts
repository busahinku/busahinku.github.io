/**
 * Calculate estimated reading time for text content
 * Based on average reading speed of 200-250 words per minute
 */

export function calculateReadingTime(content: string): {
  minutes: number;
  words: number;
  text: string;
} {
  // Remove markdown syntax and HTML tags for accurate word count
  const cleanText = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[.*?\]\(.*?\)/g, '') // Remove links (keep text only)
    .replace(/#+ /g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/^\s*>\s+/gm, '') // Remove blockquote markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Count words (split by whitespace and filter empty strings)
  const words = cleanText.split(/\s+/).filter(word => word.length > 0).length;

  // Calculate reading time (using 225 words per minute as average)
  const wordsPerMinute = 225;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));

  // Generate human-readable text
  const text = minutes === 1 ? '1 min read' : `${minutes} min read`;

  return {
    minutes,
    words,
    text
  };
}

/**
 * Format reading time for display
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min read';
  if (minutes === 1) return '1 min read';
  if (minutes < 60) return `${minutes} min read`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 1 && remainingMinutes === 0) return '1 hour read';
  if (remainingMinutes === 0) return `${hours} hours read`;
  if (hours === 1) return `1 hour ${remainingMinutes} min read`;

  return `${hours} hours ${remainingMinutes} min read`;
}

/**
 * Get reading time statistics for content
 */
export function getReadingStats(content: string) {
  const stats = calculateReadingTime(content);

  return {
    ...stats,
    wordsPerMinute: 225,
    estimatedRange: {
      fast: Math.max(1, Math.ceil(stats.words / 300)), // Fast reader (300 wpm)
      average: stats.minutes, // Average reader (225 wpm)
      slow: Math.ceil(stats.words / 150) // Slow reader (150 wpm)
    }
  };
}