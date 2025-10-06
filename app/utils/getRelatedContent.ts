import type { BlogPost } from './getBlogPosts';
import type { Project } from './getProjects';

type ContentItem = BlogPost | Project;

/**
 * Calculate Jaccard similarity between two tag arrays
 * @param tags1 First set of tags
 * @param tags2 Second set of tags
 * @returns Similarity score between 0 and 1
 */
function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  const set1 = new Set(tags1.map(t => t.toLowerCase()));
  const set2 = new Set(tags2.map(t => t.toLowerCase()));

  // Calculate intersection
  const intersection = new Set([...set1].filter(tag => set2.has(tag)));

  // Calculate union
  const union = new Set([...set1, ...set2]);

  // Jaccard similarity: intersection / union
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Get related content items based on tag similarity
 * @param currentItem The current blog post or project
 * @param allItems All available blog posts or projects
 * @param limit Maximum number of related items to return (default: 4)
 * @returns Array of related items sorted by similarity
 */
export function getRelatedContent<T extends ContentItem>(
  currentItem: T,
  allItems: T[],
  limit: number = 4
): T[] {
  // Filter out the current item
  const otherItems = allItems.filter(item => item.slug !== currentItem.slug);

  // Calculate similarity scores
  const itemsWithScores = otherItems.map(item => ({
    item,
    score: calculateTagSimilarity(currentItem.tags, item.tags)
  }));

  // Sort by similarity score (descending) and then by date (newest first)
  const sortedItems = itemsWithScores
    .filter(({ score }) => score > 0) // Only include items with at least one matching tag
    .sort((a, b) => {
      // First sort by score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If scores are equal, sort by date
      return new Date(b.item.date).getTime() - new Date(a.item.date).getTime();
    });

  // Return top N items
  return sortedItems.slice(0, limit).map(({ item }) => item);
}

/**
 * Get related blog posts for a specific post
 */
export function getRelatedBlogPosts(
  currentPost: BlogPost,
  allPosts: BlogPost[],
  limit: number = 4
): BlogPost[] {
  return getRelatedContent(currentPost, allPosts, limit);
}

/**
 * Get related projects for a specific project
 */
export function getRelatedProjects(
  currentProject: Project,
  allProjects: Project[],
  limit: number = 4
): Project[] {
  return getRelatedContent(currentProject, allProjects, limit);
}
