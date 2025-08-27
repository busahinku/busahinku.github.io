'use client';

import { useTheme } from '@/app/context/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { BlogPost } from '@/app/utils/getBlogPosts';
import MarkdownProcessor from '@/app/components/MarkdownProcessor';
import { createMarkdownComponents } from '@/app/components/MarkdownComponents';
import LikeButton from './components/LikeButton';
import Comments from './components/Comments';
import { Sun, Moon, Share2, ArrowLeft } from 'lucide-react';

interface BlogPostClientProps {
  post: BlogPost;
}

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const { theme, toggleTheme, isHydrated } = useTheme();
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Create markdown components with current theme
  const markdownComponents = createMarkdownComponents({ theme });

  // Helper function for theme-dependent classes with hydration safety
  const getThemeClasses = (darkClasses: string, lightClasses: string) => {
    if (!isHydrated) return darkClasses; // Default to dark for server render
    return theme === 'dark' ? darkClasses : lightClasses;
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Use helper function for all theme-dependent classes
  const containerClasses = `min-h-screen w-full ${getThemeClasses('bg-[#0D0D0F]', 'bg-[rgb(253,253,253)]')}`;
  const themeButtonClasses = `fixed top-8 right-8 z-50 h-12 w-12 flex items-center justify-center rounded-full backdrop-blur-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClasses('bg-black/20 hover:bg-black/30 text-white', 'bg-gray-200/50 hover:bg-gray-200/80 text-gray-700')}`;
  const backLinkClasses = `fixed top-8 left-8 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-medium backdrop-blur-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getThemeClasses('bg-black/20 hover:bg-black/30 text-white', 'bg-gray-200/50 hover:bg-gray-200/80 text-gray-700')}`;

  return (
    <div className={containerClasses} suppressHydrationWarning>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={themeButtonClasses}
        suppressHydrationWarning
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-6 h-6" />
        ) : (
          <Moon className="w-6 h-6" />
        )}
      </button>

      {/* Back to Blog Link */}
      <Link
        href="/blog"
        className={backLinkClasses}
        suppressHydrationWarning
      >
        ← Back to blog
      </Link>

      {/* Hero Section */}
      <div className="relative">
        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-[1000px] h-[500px]">
            <Image
              src={post.mainPhoto}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 1000px"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
          </div>
        </div>

        {/* Floating Title Card */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/4 w-full max-w-[800px] px-4">
          <div className={`w-full backdrop-blur-xl rounded-xl shadow-lg mx-auto px-8 py-7 ${
            theme === 'dark'
              ? 'bg-[#0D0D0F]/95 border border-white/10'
              : 'bg-white/95 border border-gray-200'
          }`}>
            <div className="text-center">
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                {post.date}
              </p>
              <h1 className={`text-2xl md:text-3xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {post.title}
              </h1>
              <div className="flex flex-wrap gap-2 justify-center">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs backdrop-blur-sm transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 text-white/80 hover:bg-white/20'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-[820px]:px-6 pt-32 lg:pt-32 pb-16">
        <article className="max-w-[800px] mx-auto">
          {/* Blog Content */}
          <div className={`${
            theme === 'dark'
              ? 'prose-invert'
              : ''
          }`}>
            <MarkdownProcessor
              content={post.content}
              components={markdownComponents}
              className="prose prose-lg max-w-none"
            />
          </div>
          
          {/* Social Sharing & Actions */}
          <div className={`mt-16 pt-8 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div 
                className="g-recaptcha" 
                data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                data-callback="onRecaptchaVerified"
                data-size="invisible"
              />
              
              <LikeButton slug={post.slug} theme={theme} />
              
              {/* Share Buttons */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label="Share on X (Twitter)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Share on X
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label="Share on Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Share on Facebook
              </a>

              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label="Share on LinkedIn"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Share on LinkedIn
              </a>

              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'dark'
                    ? copiedUrl
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : copiedUrl
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label={copiedUrl ? 'URL copied!' : 'Copy URL'}
              >
                {copiedUrl ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V17M8 5C8 6.10457 8.89543 7 10 7H12C13.1046 7 14 6.10457 14 5M8 5C8 3.89543 8.89543 3 10 3H12C13.1046 3 14 3.89543 14 5M14 5H16C17.1046 5 18 5.89543 18 7V10" strokeLinecap="round"/>
                    </svg>
                    Copy URL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <Comments slug={post.slug} theme={theme} />
        </article>
      </main>
    </div>
  );
}