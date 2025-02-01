'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';
import MobileMenu from './MobileMenu';

const Navbar = () => {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      
      // Remove timeout to make transitions immediate
      if (currentScrollY < lastScrollY) {
        // Scrolling up - show navbar immediately
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide navbar immediately
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY]);
  
  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: '/blog' },
    { label: 'Projects', path: '/projects' },
    { label: 'Resume', path: '/resume' },
    { label: 'About', path: '/about' },
    { label: 'Misc', path: '/misc' },
  ];

  return (
    <>
      <header className={`fixed top-0 w-full z-50 pt-8 ${
        isVisible 
          ? 'transition-all duration-300 ease-in-out translate-y-0' 
          : 'transition-all duration-300 ease-in-out -translate-y-full'
      }`}>
        <div className="w-full max-[820px]:px-6">
          <div className="max-w-[800px] mx-auto relative flex items-center justify-between">
            <Link href="/" className="flex items-center font-medium">
              <Image
                src={theme === 'dark' ? '/icons/logo-white.svg' : '/icons/logo-dark.svg'}
                alt="Logo"
                width={28}
                height={40}
                priority
                className="h-10 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className={`absolute left-1/2 -translate-x-1/2 rounded-3xl px-2 shadow-sm hidden min-[820px]:block ${
              theme === 'dark' 
                ? 'bg-[#1A1A1E] border border-[#2B2B2B]' 
                : 'bg-[#FBFBFB] border border-[#DADADA] shadow-[0_2px_8px_rgba(0,0,0,0.1)]'
            }`}>
              <div className="flex items-center h-10">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      pathname === item.path
                        ? 'text-[#FB2549]'
                        : theme === 'dark'
                          ? 'text-[#EEEEEE] hover:text-white'
                          : 'text-[#1A1A1E] hover:text-black'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] border border-[#2B2B2B] hover:border-[#FB2549]'
                    : 'bg-[#FCFCFC] border border-[#DADADA] hover:border-[#FB2549] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                }`}
                aria-label="Toggle theme"
              >
                <Image
                  src={theme === 'dark' ? '/icons/sun.svg' : '/icons/moon.svg'}
                  alt="Theme toggle"
                  width={20}
                  height={20}
                  className={theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}
                />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`h-10 w-10 flex items-center justify-center rounded-full min-[820px]:hidden transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] border border-[#2B2B2B]'
                    : 'bg-[#FCFCFC] border border-[#DADADA] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                }`}
                aria-label="Open menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 5h14M3 10h14M3 15h14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
      />
    </>
  );
};

export default Navbar; 