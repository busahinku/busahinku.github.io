'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import type { BlogPost } from '@/app/utils/getBlogPosts';

const BlogPostClient = dynamic(() => import('./BlogPostClient'), {
  ssr: false
});

export default function ClientWrapper({ post }: { post: BlogPost }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BlogPostClient post={post} />
    </Suspense>
  );
} 