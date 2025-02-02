import fs from 'fs/promises';
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

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    // Get the path to the blog posts directory
    const postsDirectory = path.join(process.cwd(), 'content/blog');
    
    // Get all files from the posts directory
    const fileNames = await fs.readdir(postsDirectory);
    
    // Filter for markdown files and process each one
    const postsPromises = fileNames
      .filter(fileName => fileName.endsWith('.md'))
      .map(async fileName => {
        // Remove ".md" from file name to get slug
        const slug = fileName.replace(/\.md$/, '');

        // Read markdown file as string
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = await fs.readFile(fullPath, 'utf8');

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
      });

    const posts = await Promise.all(postsPromises);
    
    // Filter out null values and sort by date
    return posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error reading blog posts:', error);
    return [];
  }
} 