/**
 * Calculate reading time for content
 * @param content - The text content to analyze
 * @param wordsPerMinute - Average reading speed (default: 200 words per minute)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(content: string, wordsPerMinute: number = 200): number {
  // Remove HTML tags and markdown syntax
  const cleanContent = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Replace links with just the text
    .replace(/[#*_~]/g, '') // Remove markdown formatting characters
    .trim();

  // Count words
  const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Calculate reading time
  const readingTime = Math.ceil(wordCount / wordsPerMinute);

  // Return at least 1 minute
  return Math.max(1, readingTime);
}
