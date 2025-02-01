import BlogPostClient from './BlogPostClient';
import { getBlogPosts } from '@/app/utils/getBlogPosts';
import { notFound } from 'next/navigation';

// Generate static pages for all blog posts at build time
export async function generateStaticParams() {
  const posts = getBlogPosts();
  console.log('Available slugs:', posts.map(post => post.slug));
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const posts = getBlogPosts();
  const post = posts.find((p) => p.slug === params.slug);

  if (!post) {
    console.log('Post not found for slug:', params.slug);
    console.log('Available posts:', posts.map(p => p.slug));
    notFound();
  }

  return <BlogPostClient post={post} />;
} 