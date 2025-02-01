import { getBlogPosts } from '../utils/getBlogPosts';
import BlogClient from './BlogClient';

export default async function BlogPage() {
  const posts = await getBlogPosts();
  
  return <BlogClient initialPosts={posts} />;
} 