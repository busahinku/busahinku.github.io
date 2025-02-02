import { getBlogPosts, type BlogPost } from '@/app/utils/getBlogPosts';
import { notFound } from 'next/navigation';
import ClientWrapper from './ClientWrapper';

// Generate static pages for all blog posts at build time
export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post: BlogPost) => ({
    slug: post.slug,
  }));
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const posts = await getBlogPosts();
  const post = posts.find((p: BlogPost) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return <ClientWrapper post={post} />;
} 