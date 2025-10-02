import { getBlogPosts } from '../utils/getBlogPosts';
import BlogClient from './BlogClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - Burak Sahin Kucuk',
  description: 'Personal blog about statistics, data science, technology, and life experiences. Read insights, tutorials, and thoughts on computing, research, and personal growth.',
  keywords: ['blog', 'statistics', 'data science', 'machine learning', 'programming', 'technology', 'Burak Sahin Kucuk', 'METU', 'computer science'],
  authors: [{
    name: 'Burak Sahin Kucuk',
    url: 'https://busahinku.github.io'
  }],
  creator: 'Burak Sahin Kucuk',
  publisher: 'Burak Sahin Kucuk',
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
    title: 'Blog - Burak Sahin Kucuk',
    description: 'Personal blog about statistics, data science, technology, and life experiences. Read insights, tutorials, and thoughts on computing, research, and personal growth.',
    type: 'website',
    url: 'https://busahinku.github.io/blog',
    siteName: 'Burak Sahin Kucuk Blog',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Burak Sahin Kucuk - Personal Blog',
        type: 'image/png',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@busahinku',
    creator: '@busahinku',
    title: 'Blog - Burak Sahin Kucuk',
    description: 'Personal blog about statistics, data science, technology, and life experiences.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://busahinku.github.io/blog',
    types: {
      'application/rss+xml': [
        { url: 'https://busahinku.github.io/rss', title: 'RSS Feed' }
      ],
      'application/atom+xml': [
        { url: 'https://busahinku.github.io/feed', title: 'Atom Feed' }
      ]
    }
  },
};

export default async function BlogPage() {
  try {
    const posts = await getBlogPosts();
    return <BlogClient initialPosts={posts} />;
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return <div>Error loading blog posts</div>;
  }
} 