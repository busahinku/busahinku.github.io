'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import type { BlogPost } from '@/app/utils/getBlogPosts';

const ThemeProvider = dynamic(() => import('@/app/context/ThemeContext').then(mod => mod.ThemeProvider), {
  ssr: false
});

const BlogPostClient = dynamic(() => import('./BlogPostClient'), {
  ssr: false
});

export default function ClientWrapper({ post }: { post: BlogPost }) {
  return (
    <ThemeProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <BlogPostClient post={post} />
      </Suspense>
    </ThemeProvider>
  );
} 