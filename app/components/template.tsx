'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Show navbar on /blog and /projects index pages, hide only on slug pages
  const segments = pathname?.split('/').filter(Boolean) ?? [];
  const topSegment = segments[0] ?? '';
  const isSlugPage = (topSegment === 'blog' || topSegment === 'projects') && segments.length > 1;
  const shouldHideNavbar = isSlugPage;

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {children}
    </>
  );
}