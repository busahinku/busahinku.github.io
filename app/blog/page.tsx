import { getBlogPosts } from '../utils/getBlogPosts';
import BlogClient from './BlogClient';

export default async function BlogPage() {
  try {
    const posts = await getBlogPosts();
    return <BlogClient initialPosts={posts} />;
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return <div>Error loading blog posts</div>;
  }
} 