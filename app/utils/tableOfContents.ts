export interface TOCItem {
  id: string;
  title: string;
  level: number;
  children?: TOCItem[];
}

/**
 * Extract headings from markdown content and generate table of contents
 */
export function generateTableOfContents(content: string): TOCItem[] {
  // Regex to match markdown headings
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { level: number; title: string; id: string }[] = [];

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length; // Number of # characters
    const title = match[2].trim();

    // Generate ID from title (similar to GitHub's approach)
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    headings.push({ level, title, id });
  }

  if (headings.length === 0) {
    return [];
  }

  // Build nested structure
  return buildNestedTOC(headings);
}

/**
 * Build nested TOC structure from flat headings array
 */
function buildNestedTOC(headings: { level: number; title: string; id: string }[]): TOCItem[] {
  const toc: TOCItem[] = [];
  const stack: TOCItem[] = [];

  for (const heading of headings) {
    const item: TOCItem = {
      id: heading.id,
      title: heading.title,
      level: heading.level
    };

    // Find the appropriate parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // This is a top-level heading
      toc.push(item);
    } else {
      // This is a nested heading
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(item);
    }

    stack.push(item);
  }

  return toc;
}

/**
 * Generate a flat list of all headings (useful for navigation)
 */
export function getFlatHeadings(toc: TOCItem[]): TOCItem[] {
  const flat: TOCItem[] = [];

  function traverse(items: TOCItem[]) {
    for (const item of items) {
      flat.push(item);
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(toc);
  return flat;
}

/**
 * Check if content has enough headings to warrant a TOC
 */
export function shouldShowTOC(content: string, minHeadings = 3): boolean {
  const headingRegex = /^#{1,6}\s+.+$/gm;
  const matches = content.match(headingRegex);
  return matches ? matches.length >= minHeadings : false;
}

/**
 * Generate TOC markdown
 */
export function generateTOCMarkdown(toc: TOCItem[]): string {
  let markdown = '';

  function renderItem(item: TOCItem, depth = 0) {
    const indent = '  '.repeat(depth);
    markdown += `${indent}- [${item.title}](#${item.id})\n`;

    if (item.children) {
      for (const child of item.children) {
        renderItem(child, depth + 1);
      }
    }
  }

  for (const item of toc) {
    renderItem(item);
  }

  return markdown.trim();
}