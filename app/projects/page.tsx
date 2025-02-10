import { getProjects } from '../utils/getProjects';
import ProjectClient from './ProjectClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects | Burak Şahinkuçuk',
  description: 'A showcase of my projects and work.',
};

export default async function ProjectsPage() {
  try {
    const projects = await getProjects();
    return <ProjectClient initialProjects={projects} />;
  } catch (error) {
    console.error('Error loading projects:', error);
    return <div>Error loading projects</div>;
  }
} 