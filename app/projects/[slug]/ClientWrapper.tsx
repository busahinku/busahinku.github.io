'use client';

import { ThemeProvider } from '@/app/context/ThemeContext';
import ProjectPostClient from './ProjectPostClient';
import type { Project } from '@/app/utils/getProjects';

interface ClientWrapperProps {
  project: Project;
}

export default function ClientWrapper({ project }: ClientWrapperProps) {
  return (
    <ThemeProvider>
      <ProjectPostClient project={project} />
    </ThemeProvider>
  );
} 