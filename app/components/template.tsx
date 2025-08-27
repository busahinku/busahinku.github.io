'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide navbar ONLY on individual blog posts and project posts (with slugs)
  const isBlogPost = pathname?.startsWith('/blog/') && pathname !== '/blog';
  const isProjectPost = pathname?.startsWith('/projects/') && pathname !== '/projects';
  const shouldHideNavbar = isBlogPost || isProjectPost;

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {children}
    </>
  );
} 