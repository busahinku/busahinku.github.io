import { getBlogPosts } from '../utils/getBlogPosts';
import BlogClient from './BlogClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - busahinku',
  description: 'A collection of blog posts.',
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