'use client';

import { useTheme } from '../context/ThemeContext';
import BackgroundPattern from '../components/BackgroundPattern';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import Image from 'next/image';
import { useState, memo, useCallback, useMemo } from 'react';
import type { Project } from '../utils/getProjects';
import { Search, X } from 'lucide-react';

interface ProjectClientProps {
  initialProjects: Project[];
}

const PROJECTS_PER_PAGE = 9;

const ProjectClient = memo(function ProjectClient({ initialProjects }: ProjectClientProps) {
  const { theme } = useTheme();
  const [selectedType, setSelectedType] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allTypes = ['All', 'Web App', 'Data Science', 'Computing', 'Finance', 'Design', 'Data Analysis', 'ML', 'DL', 'CV', 'Visualization', 'Report', 'Other'];

  // Filter projects by type and search query
  const filteredProjects = useMemo(() => {
    let filtered = selectedType === 'All'
      ? initialProjects
      : initialProjects.filter(project => project.type === selectedType.toLowerCase().replace(' ', '-'));
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [initialProjects, selectedType, searchQuery]);

  // Pagination calculations
  const { totalPages, paginatedProjects } = useMemo(() => {
    const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
    const paginatedProjects = filteredProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
    return { totalPages, paginatedProjects };
  }, [filteredProjects, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTypeChange = useCallback((type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  return (
    <div className="w-full max-[820px]:px-6 relative overflow-hidden">
      <Navbar />
      <BackgroundPattern variant="simple" />

      <main className="max-w-[800px] mx-auto pt-24 pb-16 relative z-10">

        {/* Categories Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className={`text-md font-semibold font-serif bg-gradient-to-r bg-clip-text text-transparent ${
              theme === 'dark' 
                ? 'from-white via-purple-200 to-blue-200' 
                : 'from-gray-900 via-purple-600 to-blue-600'
            }`}>
              Projects
            </h3>
            <div className={`h-px flex-1 bg-gradient-to-r ${
              theme === 'dark' 
                ? 'from-white/20 via-white/10 to-transparent' 
                : 'from-gray-300 via-gray-200 to-transparent'
            }`} />
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {allTypes.map((type, index) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`group relative overflow-hidden px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 ${
                  selectedType === type
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-purple-500/80 to-blue-500/80 text-white shadow-lg shadow-purple-500/25 border border-purple-400/50'
                      : 'bg-gray-900 text-white shadow-lg shadow-gray-900/30 border border-gray-900'
                    : theme === 'dark'
                    ? 'bg-white/10 text-white/90 border border-white/20 hover:bg-white/20 hover:border-white/40 hover:shadow-lg'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-md'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <span className="relative z-10 flex items-center gap-1">
                  {selectedType === type && (
                    <svg className="w-2 h-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {type}
                </span>
                
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%] transform" 
                     style={{ animation: selectedType === type ? 'none' : '' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className={`relative overflow-hidden rounded-lg border transition-colors duration-300 mb-6 ${
          theme === 'dark' 
            ? 'bg-black/30 border-white/20 focus-within:border-white/40' 
            : 'bg-white border-gray-300 focus-within:border-blue-400 focus-within:shadow-md'
        }`}>
          <div className="relative flex items-center">
            <Search className={`w-5 h-5 ml-4 transition-colors ${
              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
            }`} />
            <input
              type="text"
              placeholder="Search by title, description, or tags..."
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
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Projects Count */}
        <div className="mb-4">
          <p className={`text-xs ${
            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
          }`}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
            {(selectedType !== 'All' || searchQuery) && (
              <span className="ml-2">
                {selectedType !== 'All' && (
                  <span className={`px-2 py-1 rounded-md text-xs font-medium mr-1 ${
                    theme === 'dark' ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedType}
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

        {/* Enhanced Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {paginatedProjects.map((project, index) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className={`group relative overflow-hidden rounded-xl border transition-[colors,transform] duration-500 hover:scale-[1.02] hover:-translate-y-1 ${
                theme === 'dark' 
                  ? 'bg-black/20 border-white/10 hover:bg-black/25 hover:border-white/20' 
                  : 'bg-white/80 border-white/30 hover:bg-white/90 hover:border-white/40'
              } shadow-lg hover:shadow-lg`}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >


              {/* Project Image */}
              <div className="relative h-32 overflow-hidden">
                <Image
                  src={project.mainPhoto}
                  alt={project.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${
                  theme === 'dark' 
                    ? 'from-black/40 via-transparent to-transparent' 
                    : 'from-black/10 via-transparent to-transparent'
                }`} />
                
                {/* Project Type Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-black/60 border border-white/30 text-white'
                    : 'bg-white/80 border border-white/50 text-gray-800'
                }`}>
                  {project.type?.replace('-', ' ') || 'Project'}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4 relative z-10">
                <h3 className={`text-md font-semibold font-serif mb-2 mt-1 line-clamp-2 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-white group-hover:text-blue-200' : 'text-gray-900 group-hover:text-blue-700'
                }`}>
                  {project.title}
                </h3>

                <p className={`text-xs leading-relaxed mb-3 line-clamp-2 ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>
                  {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        theme === 'dark'
                          ? 'bg-white/15 text-white/80'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags.length > 2 && (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      theme === 'dark' ? 'bg-white/10 text-white/60' : 'bg-gray-50 text-gray-500'
                    }`}>
                      +{project.tags.length - 2}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                {(project.demoUrl || project.githubUrl) && (
                  <div className="flex gap-2">
                    {project.demoUrl && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(project.demoUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                          theme === 'dark'
                            ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        } shadow-md`}
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Demo
                      </button>
                    )}
                    {project.githubUrl && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(project.githubUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                          theme === 'dark'
                            ? 'bg-white/15 hover:bg-white/25 text-white border border-white/30'
                            : 'bg-white/60 hover:bg-white/80 text-gray-700 border border-white/40'
                        }`}
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        Code
                      </button>
                    )}
                  </div>
                )}

                {/* View Project Link */}
                <div className={`inline-flex items-center gap-1 text-xs font-medium mt-3 transition-all duration-300 group-hover:gap-2 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                }`}>
                  <span>View Details</span>
                  <svg 
                    className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>

              {/* Shimmer effect removed for performance */}
            </Link>
          ))}
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className={`relative overflow-hidden rounded-xl border p-4 transition-colors duration-300 ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white border-gray-200'
          } shadow-lg`}>
            
            <div className="relative z-10">
              <div className="flex justify-center items-center gap-2">
                <span className={`text-xs font-medium ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <div className="flex gap-1 ml-3">
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
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className={`relative overflow-hidden rounded-xl border p-8 text-center ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/10' 
              : 'bg-white border-gray-400'
          } shadow-lg`}>
            
            <div className="relative z-10">
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                No Projects Found
              </h3>
              <p className={`text-sm mb-4 ${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              }`}>
                No projects match your current filters. Try adjusting your search or category.
              </p>
              <div className="flex gap-2 justify-center">
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                      theme === 'dark'
                        ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                    }`}
                  >
                    Clear Search
                  </button>
                )}
                <button
                  onClick={() => {
                    handleTypeChange('All');
                    handleSearchChange('');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 ${
                    theme === 'dark'
                      ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  } shadow-md`}
                >
                  Show All Projects
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
});

export default ProjectClient;