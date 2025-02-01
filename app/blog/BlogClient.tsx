'use client';

import { useTheme } from '../context/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import type { BlogPost } from '../utils/getBlogPosts';

interface BlogClientProps {
  initialPosts: BlogPost[];
}

export default function BlogClient({ initialPosts }: BlogClientProps) {
  const { theme } = useTheme();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const postsPerPage = 10;

  const allTags = Array.from(new Set(initialPosts.flatMap(post => post.tags)));
  const displayedTags = showAllTags ? allTags : allTags.slice(0, 15);
  
  // Filter posts based on search query and selected tag
  const filteredPosts = initialPosts
    .filter(post => {
      const matchesSearch = searchQuery === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = !selectedTag || post.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag, searchQuery]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-[820px]:px-6">
      <main className="max-w-[800px] mx-auto pt-24 pb-16">
        <h1 className={`text-lg font-semibold mb-2 ${
          theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
        }`}>
          Blog
        </h1>
        <div className={`border-b pb-4 mb-4 ${
          theme === 'dark' ? 'border-[#2B2B2B]' : 'border-[#EDEDED]'
        }`}>
          <p className={`text-base ${
            theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
          }`}>
            My ideas, thoughts, experiences and notes.
          </p>
        </div>

        {/* Search Input */}
        <div className={`mb-3 ${
          theme === 'dark' ? '' : 'bg-[rgb(253,253,253)]'
        }`}>
          <div className={`relative flex items-center ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-12 px-4 pl-12 rounded-full text-sm transition-colors outline-none ${
                theme === 'dark'
                  ? 'bg-[#1A1A1E] border border-[#2B2B2B] text-[#EEEEEE] placeholder-[#EEEEEE]/40 focus:border-[#FB2549]'
                  : 'bg-[rgb(253,253,253)] border border-gray-200 text-[#1A1A1E] placeholder-[#1A1A1E]/40 focus:border-[#FB2549]'
              }`}
            />
            <svg
              className={`absolute left-4 w-5 h-5 ${
                theme === 'dark' ? 'text-[#EEEEEE]/40' : 'text-[#1A1A1E]/40'
              }`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tags Section */}
        <div className="mb-8">
          <h2 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            Tags:
          </h2>
          <div className="flex flex-wrap gap-2">
            {displayedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  theme === 'dark'
                    ? selectedTag === tag
                      ? 'bg-[#2B2B2B] text-[#EEEEEE] border border-[#FB2549]'
                      : 'bg-[#1A1A1E] text-[#EEEEEE] border border-[#2B2B2B] hover:border-[#FB2549]'
                    : selectedTag === tag
                      ? 'bg-[rgb(253,253,253)] text-[#1A1A1E] border border-[#FB2549]'
                      : 'bg-[rgb(253,253,253)] text-[#1A1A1E] border border-[#DADADA] hover:border-[#FB2549]'
                }`}
              >
                {tag}
              </button>
            ))}
            {allTags.length > 15 && !showAllTags && (
              <button
                onClick={() => setShowAllTags(true)}
                className="text-sm text-[#FB2549] hover:underline"
              >
                see all tags
              </button>
            )}
            {(showAllTags || selectedTag) && (
              <button
                onClick={() => {
                  setShowAllTags(false);
                  setSelectedTag(null);
                }}
                className="text-sm text-[#FB2549] hover:underline"
              >
                show less
              </button>
            )}
          </div>
        </div>

        {/* Latest Posts Section */}
        <section>
          <h2 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            Latest Posts:
          </h2>
          <div className="space-y-4">
            {currentPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className={`block group relative overflow-hidden rounded-2xl border ${
                  theme === 'dark' 
                    ? 'border-[#2B2B2B]' 
                    : 'border-gray-200'
                } transition-all duration-300`}
              >
                <div className="absolute inset-0 bg-[#FB2549]/5 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out z-[2]" />
                <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-black via-black to-transparent'
                    : 'bg-gradient-to-r from-white via-white to-transparent'
                } z-[1]`} />
                <div className="flex relative">
                  <div className="w-full p-6 relative z-10">
                    <p className={`text-sm mb-2 ${
                      theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
                    }`}>
                      {post.date}
                    </p>
                    <h3 className={`text-xl font-semibold mb-2 transition-colors ${
                      theme === 'dark' 
                        ? 'text-white group-hover:text-[#FB2549]' 
                        : 'text-[#1A1A1E] group-hover:text-[#FB2549]'
                    }`}>
                      {post.title}
                    </h3>
                    <p className={`text-sm mb-4 max-w-[70%] ${
                      theme === 'dark' ? 'text-white/80' : 'text-[#1A1A1E]/80'
                    }`}>
                      {post.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs leading-none ${
                            theme === 'dark'
                              ? 'bg-[#1A1A1E] text-[#EEEEEE] border border-[#2B2B2B]'
                              : 'bg-[rgb(253,253,253)] text-[#1A1A1E] border border-gray-300'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="absolute right-0 top-0 h-full w-[60%] overflow-hidden">
                    <Image
                      src={post.mainPhoto}
                      alt={post.title}
                      fill
                      className="object-cover transition-all duration-500 ease-in-out transform group-hover:scale-105"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className={`text-sm ${
              theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
            }`}>
              Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, filteredPosts.length)} of {filteredPosts.length} posts
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-[#FB2549]'
                } ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] text-[#EEEEEE] border border-[#2B2B2B]'
                    : 'bg-[rgb(253,253,253)] text-[#1A1A1E] border border-[#DADADA]'
                }`}
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-colors flex items-center justify-center ${
                    currentPage === pageNum
                      ? theme === 'dark'
                        ? 'bg-[#2B2B2B] text-[#EEEEEE]'
                        : 'bg-[#FB2549] text-[#EEEEEE]'
                      : theme === 'dark'
                        ? 'bg-[#1A1A1E] text-[#EEEEEE] border border-[#2B2B2B] hover:border-[#FB2549]'
                        : 'bg-[rgb(253,253,253)] text-[#1A1A1E] border border-[#DADADA] hover:border-[#FB2549]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-[#FB2549]'
                } ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] text-[#EEEEEE] border border-[#2B2B2B]'
                    : 'bg-[rgb(253,253,253)] text-[#1A1A1E] border border-[#DADADA]'
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 