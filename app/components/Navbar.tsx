'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';
import MobileMenu from './MobileMenu';
import { Sun, Moon, Menu } from 'lucide-react';

const Navbar = memo(function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const controlNavbar = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Simple logic: 
    // - Scrolling down: hide navbar (after 50px)
    // - Scrolling up: show navbar immediately
    // - At top: always show navbar
    
    if (currentScrollY < 50) {
      // Always show at the top
      setIsVisible(true);
    } else if (currentScrollY > lastScrollY) {
      // Scrolling down - hide navbar
      setIsVisible(false);
    } else if (currentScrollY < lastScrollY) {
      // Scrolling up - show navbar
      setIsVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener('scroll', controlNavbar, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [controlNavbar]);
  
  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: '/blog' },
    { label: 'Projects', path: '/projects' },
    { label: 'About', path: '/about' },
    { label: 'Misc', path: '/misc' },
  ];

  return (
    <>
      <header className={`fixed top-0 w-full z-50 pt-8 transition-all duration-300 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0'
      }`}>
        <div className="w-full max-[820px]:px-6">
          <div className="max-w-[800px] mx-auto relative flex items-center justify-between">
            {/* Mobile: Centered logo */}
            <Link href="/" className="flex items-center font-medium group min-[820px]:block absolute left-1/2 -translate-x-1/2 min-[820px]:static min-[820px]:translate-x-0">
              <div className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                <Image
                  src={theme === 'dark' ? '/icons/logo-white.svg' : '/icons/logo-dark.svg'}
                  alt="Burak Sahin Kucuk - Personal Logo"
                  width={28}
                  height={40}
                  priority
                  className="h-10 w-auto"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className={`absolute left-1/2 -translate-x-1/2 rounded-3xl px-2 shadow-sm hidden min-[820px]:block transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-[#1A1A1E]/80 backdrop-blur-md border border-[#2B2B2B]' 
                : 'bg-[#FBFBFB]/80 backdrop-blur-md border border-[#DADADA] shadow-[0_2px_8px_rgba(0,0,0,0.1)]'
            }`}>
              <div className="flex items-center h-10">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 relative group ${
                      (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)))
                        ? 'text-[#FB2549]'
                        : theme === 'dark'
                          ? 'text-[#EEEEEE] hover:text-white'
                          : 'text-[#1A1A1E] hover:text-black'
                    }`}
                  >
                    <span className="relative z-10">{item.label}</span>
                    {(pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))) && (
                      <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                        theme === 'dark' 
                          ? 'bg-[#FB2549]/10' 
                          : 'bg-[#FB2549]/10'
                      }`}></div>
                    )}
                    <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                      theme === 'dark' 
                        ? 'bg-white/5' 
                        : 'bg-black/5'
                    }`}></div>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="flex items-center gap-4 ml-auto">
              <button
                onClick={toggleTheme}
                className={`h-10 w-10 flex items-center justify-center rounded-full transition-all duration-300 group ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E]/80 backdrop-blur-md border border-[#2B2B2B] hover:border-[#FB2549] hover:bg-[#232327]'
                    : 'bg-[#FCFCFC]/80 backdrop-blur-md border border-[#DADADA] hover:border-[#FB2549] hover:bg-gray-50 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                }`}
                aria-label="Toggle theme"
              >
                <div className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-[#EEEEEE]" />
                  ) : (
                    <Moon className="w-5 h-5 text-[#1A1A1E]" />
                  )}
                </div>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`h-10 w-10 flex items-center justify-center rounded-full min-[820px]:hidden transition-all duration-300 group ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E]/80 backdrop-blur-md border border-[#2B2B2B] hover:bg-[#232327]'
                    : 'bg-[#FCFCFC]/80 backdrop-blur-md border border-[#DADADA] hover:bg-gray-50 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                }`}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
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
});

export default Navbar; 