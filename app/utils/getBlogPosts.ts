import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string;
  tags: string[];
  mainPhoto: string;
}

export function getBlogPosts(): BlogPost[] {
  // Get the path to the blog posts directory
  const postsDirectory = path.join(process.cwd(), 'content/blog');
  
  // Ensure the directory exists
  if (!fs.existsSync(postsDirectory)) {
    console.warn('Blog posts directory not found:', postsDirectory);
    return [];
  }

  // Get all files from the posts directory
  const fileNames = fs.readdirSync(postsDirectory);
  
  // Filter for markdown files and process each one
  const allPosts = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      // Remove ".md" from file name to get slug
      const slug = fileName.replace(/\.md$/, '');

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      // Use gray-matter to parse the post metadata section
      const { data, content } = matter(fileContents);

      // Validate required fields
      if (!data.title || !data.description || !data.date || !data.tags || !data.mainPhoto) {
        console.warn(`Missing required fields in ${fileName}`);
        return null;
      }

      // Combine the data with the slug
      return {
        slug,
        content,
        title: data.title,
        description: data.description,
        date: data.date,
        tags: data.tags,
        mainPhoto: data.mainPhoto,
      };
    })
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allPosts;
} 