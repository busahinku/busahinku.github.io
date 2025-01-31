'use client';

import { useTheme } from '../context/ThemeContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: Array<{ label: string; path: string; }>;
}

export default function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Menu */}
      <div className={`fixed top-0 right-0 h-full w-[300px] transition-transform duration-300 ease-in-out z-50 rounded-tl-3xl rounded-bl-3xl ${
        theme === 'dark'
          ? 'bg-[#1A1A1E] border-l border-[#2B2B2B]'
          : 'bg-[#F7F7F7] border-l border-[#DADADA]'
        } ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className={`text-lg font-medium ${
              theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
            }`}>Navigation</h2>
            <button 
              onClick={onClose}
              className={`p-2 transition-colors ${
                theme === 'dark' 
                  ? 'text-[#EEEEEE] hover:text-[#FB2549]'
                  : 'text-[#1A1A1E] hover:text-[#FB2549]'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-base font-medium transition-colors ${
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
          </nav>
        </div>
      </div>
    </>
  );
} 