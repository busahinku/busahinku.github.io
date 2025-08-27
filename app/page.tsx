import { getBlogPosts } from './utils/getBlogPosts';
import HomeClient from './HomeClient';

export default async function Home() {
  let latestBlogTitle = 'Complete Markdown Features Test';
  
  try {
    const posts = await getBlogPosts();
    if (posts.length > 0) {
      latestBlogTitle = posts[0].title;
    }
  } catch (error) {
    console.error('Error fetching latest blog post:', error);
  }

  return <HomeClient latestBlogTitle={latestBlogTitle} />;
}