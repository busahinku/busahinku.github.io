import { NextResponse } from 'next/server';
import { getBlogPosts } from '../../utils/getBlogPosts';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  try {
    const posts = await getBlogPosts();
    
    if (posts.length > 0) {
      return NextResponse.json({ 
        title: posts[0].title,
        success: true 
      });
    } else {
      return NextResponse.json({ 
        title: 'No blog posts available',
        success: true 
      });
    }
  } catch (error) {
    console.error('Error fetching latest blog post:', error);
    return NextResponse.json({ 
      title: 'How I handled large file uploads in a Serverless Next.js app',
      success: false 
    }, { status: 500 });
  }
} 