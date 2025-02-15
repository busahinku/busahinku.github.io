import { getBlogPosts } from '@/app/utils/getBlogPosts';
import { notFound } from 'next/navigation';
import ClientWrapper from './ClientWrapper';
import { Metadata } from 'next';

// Generate static pages for all blog posts at build time
export async function generateStaticParams() {
  try {
    const posts = await getBlogPosts();
    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getBlogPosts();
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return {
      title: 'Blog Post Not Found',
    };
  }

  return {
    title: `${post.title} | Burak Sahin Kucuk`,
    description: post.description,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  try {
    const posts = await getBlogPosts();
    const post = posts.find((p) => p.slug === slug);

    if (!post) {
      notFound();
    }

    return <ClientWrapper post={post} />;
  } catch (error) {
    console.error('Error loading blog post:', error);
    notFound();
  }
} 