'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import type { Project } from '@/app/utils/getProjects';

const ProjectPostClient = dynamic(() => import('./ProjectPostClient'), {
  ssr: false
});

export default function ClientWrapper({ project }: { project: Project }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectPostClient project={project} />
    </Suspense>
  );
} 