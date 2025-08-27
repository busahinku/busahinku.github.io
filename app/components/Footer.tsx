'use client';

import { useTheme } from '../context/ThemeContext';
import { ArrowUp } from 'lucide-react';

const Footer = () => {
  const { theme, isHydrated } = useTheme();
  
  const handleScrollToTop = () => {
    try {
      // Multiple approaches to ensure it works
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    } catch (error) {
      console.log('Scroll to top failed:', error);
    }
  };

  // Use dark theme classes by default (matches server render)
  const footerClasses = isHydrated 
    ? `w-full border-t mt-auto ${
        theme === 'dark' 
          ? 'border-gray-800 bg-black' 
          : 'border-gray-200 bg-white'
      }`
    : 'w-full border-t mt-auto border-gray-800 bg-black';

  const textClasses = isHydrated
    ? `text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`
    : 'text-sm text-gray-400';

  const buttonClasses = isHydrated
    ? `flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
        theme === 'dark'
          ? 'text-gray-300 hover:text-white hover:bg-gray-800'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`
    : 'flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-gray-800';

  return (
    <footer className={footerClasses} suppressHydrationWarning>
      <div className="max-w-[800px] mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left side - Copyright */}
          <div className={textClasses} suppressHydrationWarning>
            © {new Date().getFullYear()} busahinku
          </div>
          
          {/* Right side - Back to top */}
          <button
            onClick={handleScrollToTop}
            className={buttonClasses}
            suppressHydrationWarning
          >
            <span>Back to top</span>
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 