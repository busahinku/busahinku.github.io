'use client';

import { useTheme } from '../context/ThemeContext';

const Footer = () => {
  const { theme } = useTheme();
  
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

  return (
    <footer className={`w-full border-t mt-auto ${
      theme === 'dark' 
        ? 'border-gray-800 bg-black' 
        : 'border-gray-200 bg-white'
    }`}>
      <div className="max-w-[800px] mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left side - Copyright */}
          <div className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            © {new Date().getFullYear()} busahinku
          </div>
          
          {/* Right side - Back to top */}
          <button
            onClick={handleScrollToTop}
            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>Back to top</span>
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 10l7-7m0 0l7 7m-7-7v18" 
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 