'use client';

import { usePathname } from 'next/navigation';
import Navbar from './components/Navbar';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  console.log('TEMPLATE RUNNING - pathname:', pathname);
  
  // Hide navbar ONLY on individual blog posts and project posts
  const isBlogPost = pathname?.includes('/blog/') && pathname !== '/blog';
  const isProjectPost = pathname?.includes('/projects/') && pathname !== '/projects';
  const shouldHideNavbar = isBlogPost || isProjectPost;
  
  console.log('isBlogPost:', isBlogPost);
  console.log('isProjectPost:', isProjectPost);
  console.log('shouldHideNavbar:', shouldHideNavbar);
  console.log('Will show navbar:', !shouldHideNavbar);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {children}
    </>
  );
} 