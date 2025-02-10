import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface Project {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string;
  tags: string[];
  mainPhoto: string;
  demoUrl?: string;
  githubUrl?: string;
  type: string;
}

export async function getProjects(): Promise<Project[]> {
  try {
    // Get the path to the projects directory
    const projectsDirectory = path.join(process.cwd(), 'content/projects');
    
    // Get all files from the projects directory
    const fileNames = await fs.readdir(projectsDirectory);
    
    // Filter for markdown files and process each one
    const projectsPromises = fileNames
      .filter(fileName => fileName.endsWith('.md'))
      .map(async fileName => {
        // Remove ".md" from file name to get slug
        const slug = fileName.replace(/\.md$/, '');

        // Read markdown file as string
        const fullPath = path.join(projectsDirectory, fileName);
        const fileContents = await fs.readFile(fullPath, 'utf8');

        // Use gray-matter to parse the project metadata section
        const { data, content } = matter(fileContents);

        // Validate required fields
        if (!data.title || !data.description || !data.date || !data.tags || !data.mainPhoto || !data.type) {
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
          demoUrl: data.demoUrl,
          githubUrl: data.githubUrl,
          type: data.type,
        };
      });

    const projects = await Promise.all(projectsPromises);
    // Filter out null values and sort by date
    const validProjects = projects.filter((project): project is NonNullable<typeof project> => project !== null);
    return validProjects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
} 