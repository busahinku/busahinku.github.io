'use client';

import { useTheme } from '@/app/context/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeSlug from 'rehype-slug';
import remarkEmoji from 'remark-emoji';
import remarkToc from 'remark-toc';
import type { Project } from '@/app/utils/getProjects';
import { useState } from 'react';
import rehypeRaw from 'rehype-raw';
import { markdownComponents } from '@/app/blog/components/MarkdownComponents';

interface ProjectPostClientProps {
  project: Project;
}

export default function ProjectPostClient({ project }: ProjectPostClientProps) {
  const { theme, toggleTheme } = useTheme();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-[#0D0D0F]' : 'bg-[rgb(253,253,253)]'}`}>
      <button
        onClick={toggleTheme}
        className={`fixed top-8 right-8 z-50 h-10 w-10 flex items-center justify-center rounded-full backdrop-blur-2xl transition-colors ${
          theme === 'dark'
            ? 'bg-black/20 hover:bg-black/30 text-white'
            : 'bg-gray-200/50 hover:bg-gray-200/80 text-gray-700'
        }`}
        aria-label="Toggle theme"
      >
        <Image
          src={theme === 'dark' ? '/icons/sun.svg' : '/icons/moon.svg'}
          alt="Theme toggle"
          width={20}
          height={20}
        />
      </button>

      <Link
        href="/projects"
        className={`fixed top-8 left-8 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-colors ${
          theme === 'dark'
            ? 'bg-black/20 hover:bg-black/30 text-white'
            : 'bg-gray-200/50 hover:bg-gray-200/80 text-gray-700'
        }`}
      >
        ← Back to projects
      </Link>

      <div className="relative">
        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-[1000px] h-[500px]">
            <Image
              src={project.mainPhoto}
              alt={project.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
          </div>
        </div>

        <div className="absolute opacity-82 left-1/2 -translate-x-1/2 bottom-0 translate-y-1/4 w-full max-w-[800px]">
          <div className={`w-full backdrop-blur-sm rounded-xl shadow-lg mx-auto px-8 py-7 ${
            theme === 'dark'
              ? 'bg-[#0D0D0F]/95'
              : 'bg-white/95'
          }`}>
            <div className="text-center opacity-100">
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                {project.date}
              </p>
              <h1 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {project.title}
              </h1>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {project.tags.map((tag) => (
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
              {(project.demoUrl || project.githubUrl) && (
                <div className="flex gap-4 justify-center">
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm ${
                        theme === 'dark'
                          ? 'bg-[#2B2B2B] text-white hover:bg-[#3B3B3B]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      View Demo
                    </a>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm ${
                        theme === 'dark'
                          ? 'bg-[#2B2B2B] text-white hover:bg-[#3B3B3B]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      View on GitHub
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="w-full max-[820px]:px-6 pt-32 pb-16">
        <article className="max-w-[800px] mx-auto">
          <div className={`prose max-w-none ${
            theme === 'dark'
              ? 'prose-invert prose-p:text-[#EEEEEE]/80 prose-headings:text-[#EEEEEE]'
              : 'prose-p:text-[#1A1A1E]/80 prose-headings:text-[#1A1A1E]'
          }`}>
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm, 
                remarkMath,
                remarkEmoji,
                [remarkToc, { heading: "table of contents", tight: true }]
              ]}
              rehypePlugins={[
                rehypeKatex,
                rehypeSlug,
                rehypeRaw
              ]}
              components={markdownComponents}
            >
              {project.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
} 