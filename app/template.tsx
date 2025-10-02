'use client';

import { usePathname } from 'next/navigation';
import Navbar from './components/Navbar';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide navbar ONLY on individual blog posts and project posts
  const isBlogPost = pathname?.includes('/blog/') && pathname !== '/blog';
  const isProjectPost = pathname?.includes('/projects/') && pathname !== '/projects';
  const shouldHideNavbar = isBlogPost || isProjectPost;

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {children}
    </>
  );
} 