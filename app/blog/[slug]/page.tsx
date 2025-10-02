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

  const publishedTime = new Date(post.date).toISOString();

  const articleUrl = `https://busahinku.github.io/blog/${slug}`;

  return {
    title: `${post.title}`,
    description: post.description,
    keywords: [...post.tags, 'Burak Sahin Kucuk', 'blog', 'statistics', 'data science', 'programming'],
    authors: [{
      name: "Burak Sahin Kucuk",
      url: "https://busahinku.github.io"
    }],
    creator: "Burak Sahin Kucuk",
    publisher: "Burak Sahin Kucuk",
    category: post.tags[0] || 'Technology',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: articleUrl,
      siteName: 'Burak Sahin Kucuk Blog',
      locale: 'en_US',
      publishedTime,
      modifiedTime: publishedTime,
      authors: ['Burak Sahin Kucuk'],
      tags: post.tags,
      section: post.tags[0] || 'Technology',
      images: post.mainPhoto ? [
        {
          url: post.mainPhoto,
          width: 1200,
          height: 630,
          alt: `Featured image for article: ${post.title}`,
          type: 'image/jpeg',
        }
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@busahinku',
      creator: '@busahinku',
      title: post.title,
      description: post.description,
      images: post.mainPhoto ? [{
        url: post.mainPhoto,
        alt: `Featured image for article: ${post.title}`,
      }] : undefined,
    },
    alternates: {
      canonical: articleUrl,
    },
    other: {
      'article:author': 'Burak Sahin Kucuk',
      'article:published_time': publishedTime,
      'article:modified_time': publishedTime,
      'article:section': post.tags[0] || 'Technology',
      'article:tag': post.tags.join(','),
      'twitter:label1': 'Reading time',
      'twitter:data1': post.readingTime.text,
      'twitter:label2': 'Written by',
      'twitter:data2': 'Burak Sahin Kucuk',
    },
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