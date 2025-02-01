'use client';

import Link from 'next/link';
import { useTheme } from '../context/ThemeContext';

const Footer = () => {
  const { theme } = useTheme();
  
  const footerLinks = [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: '/blog' },
    { label: 'Projects', path: '/projects' },
    { label: 'Resume', path: '/resume' },
    { label: 'About', path: '/about' },
    { label: 'Misc', path: '/misc' },
    { label: 'References', path: '/references' },
  ];


  return (
    <footer className={`w-full py-8 mt-16 border-t ${
      theme === 'dark' 
        ? 'border-[#2B2B2B]' 
        : 'border-[#DADADA]'
    }`}>
      <div className="w-full max-[820px]:px-6">
        <div className="max-w-[800px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Navigation Links */}
            <nav className="flex items-center gap-4 flex-wrap justify-center">
              {footerLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-sm transition-colors ${
                    theme === 'dark'
                      ? 'text-[#EEEEEE] hover:text-white'
                      : 'text-[#1A1A1E] hover:text-black'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Back to Top Link */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`text-sm transition-colors ${
                theme === 'dark'
                  ? 'text-[#EEEEEE] hover:text-white'
                  : 'text-[#1A1A1E] hover:text-black'
              }`}
            >
              To the top
            </button>
          </div>

          {/* Copyright and License */}
          <div className={`text-sm mt-6 ${
            theme === 'dark'
              ? 'text-[#EEEEEE]/60'
              : 'text-[#1A1A1E]/60'
          }`}>
            <p>All Rights Reserved - {new Date().getFullYear()}, busahinku</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 