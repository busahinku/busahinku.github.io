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
  const postsPerPage = 6;

  const allTags = Array.from(new Set(initialPosts.flatMap(post => post.tags)));
  const displayedTags = showAllTags ? allTags : allTags.slice(0, 12);
  
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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleTagChange = (tag: string | null) => {
    setSelectedTag(selectedTag === tag ? null : tag);
    setCurrentPage(1);
  };

  return (
    <div className="w-full max-[820px]:px-6 relative overflow-hidden">
      {/* Beautiful Background */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-[#0D0D0F]' 
            : 'bg-white'
        }`} />
        
        {/* Floating Orbs - Only for dark mode */}
        {theme === 'dark' && (
          <>
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 bg-purple-500 animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 bg-blue-500 animate-float-delayed" />
            <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full blur-2xl opacity-25 bg-cyan-500 animate-pulse" />
            <div className="absolute top-3/4 left-1/2 w-40 h-40 rounded-full blur-3xl opacity-10 bg-green-500 animate-float" />
          </>
        )}
      </div>

      <main className="max-w-[800px] mx-auto pt-24 pb-16 relative z-10">
        {/* Enhanced Header Section */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold bg-gradient-to-r mb-3 ${
            theme === 'dark' 
              ? 'from-white via-purple-200 to-cyan-200' 
              : 'from-gray-900 via-purple-600 to-blue-600'
          } bg-clip-text text-transparent`}>
            Blog
          </h1>
          
          <p className={`text-base max-w-xl mx-auto leading-relaxed ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            My ideas, thoughts, experiences and notes on various topics.
          </p>
        </div>

        {/* Beautiful Tags Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className={`text-md font-semibold bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' 
                ? 'from-white via-purple-200 to-blue-200' 
                : 'from-gray-900 via-purple-600 to-blue-600'
            }`}>
              Explore Topics
            </h3>
            <div className={`h-px flex-1 bg-gradient-to-r ${
              theme === 'dark' 
                ? 'from-white/20 via-white/10 to-transparent' 
                : 'from-gray-300 via-gray-200 to-transparent'
            }`} />
            {selectedTag && (
              <button
                onClick={() => handleTagChange(null)}
                className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 hover:text-red-200 border border-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear &quot;{selectedTag}&quot;
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4 mx-2">
            {displayedTags.map((tag, index) => (
              <button
                key={tag}
                onClick={() => handleTagChange(tag)}
                className={`group relative overflow-hidden px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 ${
                  selectedTag === tag
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-purple-500/80 to-blue-500/80 text-white shadow-lg shadow-purple-500/25 border border-purple-400/50'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                    : theme === 'dark'
                    ? 'bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 hover:border-white/40 hover:shadow-lg'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-md'
                } backdrop-blur-sm`}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <span className="relative z-10 flex items-center gap-1">
                  {selectedTag === tag && (
                    <svg className="w-2 h-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {tag}
                </span>
                
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%] transform" 
                     style={{ animation: selectedTag === tag ? 'none' : '' }} />
              </button>
            ))}
          </div>

          {/* Enhanced Tag Controls */}
          <div className="flex items-center gap-4 text-sm">
            {allTags.length > 12 && !showAllTags && (
              <button
                onClick={() => setShowAllTags(true)}
                className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 hover:scale-105 ${
                  theme === 'dark' 
                    ? 'text-blue-300 hover:text-blue-200 hover:bg-blue-500/10' 
                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
                Show all {allTags.length} tags
              </button>
            )}
            
            {showAllTags && (
              <button
                onClick={() => setShowAllTags(false)}
                className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 hover:scale-105 ${
                  theme === 'dark' 
                    ? 'text-blue-300 hover:text-blue-200 hover:bg-blue-500/10' 
                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
                Show less
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div className={`relative overflow-hidden rounded-lg backdrop-blur-md border transition-all duration-300 mb-6 ${
          theme === 'dark' 
            ? 'bg-black/30 border-white/20 focus-within:border-white/40' 
            : 'bg-white border-gray-300 focus-within:border-blue-400 focus-within:shadow-md'
        }`}>
          <div className="relative flex items-center">
            <svg className={`w-5 h-5 ml-4 transition-colors ${
              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search posts by title or description..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`w-full py-3 px-4 focus:outline-none transition-all duration-300 ${
                theme === 'dark' 
                  ? 'text-white placeholder-white/60' 
                  : 'bg-transparent text-gray-900 placeholder-gray-500'
              }`}
              style={{
                backgroundColor: 'transparent',
                color: theme === 'dark' ? 'white' : '#1f2937'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className={`mr-3 p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                  theme === 'dark' 
                    ? 'hover:bg-white/20 text-white/70 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Posts Count and Filters */}
        <div className="mb-4">
          <p className={`text-xs ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} found
            {(selectedTag || searchQuery) && (
              <span className="ml-2">
                {selectedTag && (
                  <span className={`px-2 py-1 rounded-md text-xs font-medium mr-1 ${
                    theme === 'dark' ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedTag}
                  </span>
                )}
                {searchQuery && (
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    theme === 'dark' ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-gray-700'
                  }`}>
                    &quot;{searchQuery}&quot;
                  </span>
                )}
              </span>
            )}
          </p>
        </div>

        {/* Blog Posts Section */}
        <section>
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
        </section>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className={`relative overflow-hidden rounded-xl backdrop-blur-lg border p-4 transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white border-gray-200'
          } shadow-lg`}>
            
            <div className="relative z-10">
              <div className="flex justify-center items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <div className="flex gap-1 ml-3">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                      currentPage === 1
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    } ${
                      theme === 'dark'
                        ? 'bg-white/15 text-white/80 border border-white/30 hover:bg-white/25'
                        : 'bg-white/60 text-gray-700 border border-white/30 hover:bg-white/90'
                    } backdrop-blur-sm`}
                  >
                    ←
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                        currentPage === page
                          ? theme === 'dark'
                            ? 'bg-white/25 text-white border border-white/40 shadow-md'
                            : 'bg-gray-900 text-white shadow-md'
                          : theme === 'dark'
                          ? 'bg-white/15 text-white/80 border border-white/30 hover:bg-white/25'
                          : 'bg-white/60 text-gray-700 border border-white/30 hover:bg-white/90'
                      } backdrop-blur-sm`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                      currentPage === totalPages
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    } ${
                      theme === 'dark'
                        ? 'bg-white/15 text-white/80 border border-white/30 hover:bg-white/25'
                        : 'bg-white/60 text-gray-700 border border-white/30 hover:bg-white/90'
                    } backdrop-blur-sm`}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className={`relative overflow-hidden rounded-xl backdrop-blur-lg border p-8 text-center ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white border-gray-200'
          } shadow-lg`}>
            
            <div className="relative z-10">
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                No Posts Found
              </h3>
              <p className={`text-sm mb-4 ${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              }`}>
                No blog posts match your current filters. Try adjusting your search or tags.
              </p>
              <div className="flex gap-2 justify-center">
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                      theme === 'dark'
                        ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                    } backdrop-blur-sm`}
                  >
                    Clear Search
                  </button>
                )}
                <button
                  onClick={() => {
                    handleTagChange(null);
                    handleSearchChange('');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                    theme === 'dark'
                      ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  } backdrop-blur-sm shadow-md`}
                >
                  Show All Posts
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 