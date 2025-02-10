'use client';

import { useTheme } from '../context/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { Project } from '../utils/getProjects';

interface ProjectClientProps {
  initialProjects: Project[];
}

const PROJECTS_PER_PAGE = 9;

export default function ProjectClient({ initialProjects }: ProjectClientProps) {
  const { theme } = useTheme();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Tüm proje tiplerini projelerden çıkar
  const allTypes = ['All', 'Web App', 'Data Science', 'Computing', 'Finance', 'Design', 'Other'];

  // Projeleri tipe göre filtrele
  const filteredProjects = selectedType && selectedType !== 'All'
    ? initialProjects.filter(project => project.type === selectedType.toLowerCase().replace(' ', '-'))
    : initialProjects;

  // Pagination için hesaplamalar
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);

  // Sayfa değiştiğinde scroll'u yukarı al
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tip değiştiğinde sayfa numarasını sıfırla
  const handleTypeChange = (type: string | null) => {
    setSelectedType(selectedType === type ? null : type);
    setCurrentPage(1);
  };

  return (
    <div className="w-full max-[820px]:px-6">
      <main className="max-w-[800px] mx-auto pt-24 pb-16">
        {/* Header Section */}
        <div className="mb-4">
          <h1 className={`text-lg font-semibold mb-2 text-[#EEEEEE] ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>
            Projects
          </h1>
          <div className={`border-b pb-4 ${
            theme === 'dark' ? 'border-[#2B2B2B]' : 'border-[#EDEDED]'
          }`}>
            <p className={`text-base ${
              theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
            }`}>
              A showcase of my projects and work.
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                  selectedType === type
                    ? theme === 'dark'
                      ? 'bg-white text-black'
                      : 'bg-black text-white'
                    : theme === 'dark'
                    ? 'bg-[#1A1A1E] text-white hover:bg-white/10'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center mb-8">
          {paginatedProjects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className={`group relative overflow-hidden rounded-xl w-full flex flex-col ${
                theme === 'dark' 
                  ? 'bg-[#1A1A1E]' 
                  : 'bg-white border border-gray-100'
              } transition-all duration-300 hover:scale-[1.03]`}
            >
              <div className="relative w-full h-[150px] overflow-hidden">
                <Image
                  src={project.mainPhoto}
                  alt={project.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-102"
                />
              </div>

              <div className="flex-1 flex flex-col p-4">
                <div className="flex-1">
                  <h3 className={`text-base font-semibold mb-2 line-clamp-2 min-h-[40px] ${
                    theme === 'dark' ? 'text-white' : 'text-black'
                  }`}>
                    {project.title}
                  </h3>
                  <p className={`text-sm mb-3 line-clamp-2 ${
                    theme === 'dark' ? 'text-white/60' : 'text-black/60'
                  }`}>
                    {project.description.length > 100 
                      ? `${project.description.slice(0, 100)}...` 
                      : project.description}
                  </p>
                </div>

                <div className="mt-auto">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          theme === 'dark'
                            ? 'bg-white/10 text-white'
                            : 'bg-black/5 text-black'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {(project.demoUrl || project.githubUrl) && (
                    <div className="flex gap-2">
                      {project.demoUrl && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(project.demoUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
                            theme === 'dark'
                              ? 'bg-white text-black hover:bg-white/90'
                              : 'bg-black text-white hover:bg-black/90'
                          }`}
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
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
                            theme === 'dark'
                              ? 'bg-white/10 text-white hover:bg-white/20'
                              : 'bg-black/5 text-black hover:bg-black/10'
                          }`}
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          GitHub
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                currentPage === page
                  ? theme === 'dark'
                    ? 'bg-white text-black'
                    : 'bg-black text-white'
                  : theme === 'dark'
                  ? 'bg-[#1A1A1E] text-white hover:bg-white/10'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}