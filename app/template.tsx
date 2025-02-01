'use client';

import { usePathname } from 'next/navigation';
import Navbar from './components/Navbar';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBlogPost = pathname?.includes('/blog/') && pathname !== '/blog';

  return (
    <>
      {!isBlogPost && <Navbar />}
      {children}
    </>
  );
} 