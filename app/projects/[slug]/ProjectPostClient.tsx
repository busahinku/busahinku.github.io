'use client';
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
import type { Components } from 'react-markdown';
import { useState, } from 'react';
import rehypeRaw from 'rehype-raw';
import { Highlight, themes } from 'prism-react-renderer';
import type { Project } from '@/app/utils/getProjects';

interface ProjectPostClientProps {
  project: Project;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface HeadingProps {
  children: React.ReactNode;
  id?: string;
}

interface ListProps {
  children: React.ReactNode;
}

interface ParagraphProps {
  children: React.ReactNode;
  node?: {
    children: Array<{
      type: string;
      tagName?: string;
    }>;
    parent?: {
      type: string;
      tagName?: string;
    };
  };
}


export default function ProjectPostClient({ project }: ProjectPostClientProps) {
  const { theme, toggleTheme } = useTheme();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const CodeBlock = ({ inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const code = children as string;
    const isCopied = copiedCode === code;

    if (inline) {
      return (
        <code
          className={`px-1.5 py-0.5 rounded text-sm font-mono ${
            theme === 'dark' 
              ? 'bg-[#1A1A1E] text-[#EEEEEE]' 
              : 'bg-gray-100 text-gray-800'
          }`}
          {...props}
        >
          {children}
        </code>
      );
    }

    const handleCopy = async () => {
      if (typeof window !== 'undefined') {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => {
          setCopiedCode(null);
        }, 2000);
      }
    };

    return (
      <div className="relative group">
        <Highlight
          theme={theme === 'dark' ? themes.nightOwl : themes.github}
          code={code}
          language={language || 'text'}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`p-5 rounded-lg overflow-auto text-sm font-mono my-4 border ${
                theme === 'dark'
                  ? 'bg-[#1A1A1E] border-gray-800'
                  : 'bg-gray-50 border-gray-200'
              }`}
              style={style}
            >
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {language && (
                  <div className={`px-2 py-1 rounded text-xs font-mono ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white/60'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {language}
                  </div>
                )}
                <button
                  onClick={handleCopy}
                  className={`px-2 py-1 rounded text-xs transition-all duration-200 flex items-center gap-1.5 ${
                    theme === 'dark'
                      ? isCopied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                      : isCopied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V17M8 5C8 6.10457 8.89543 7 10 7H12C13.1046 7 14 6.10457 14 5M8 5C8 3.89543 8.89543 3 10 3H12C13.1046 3 14 3.89543 14 5M14 5H16C17.1046 5 18 5.89543 18 7V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <code className={className}>
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    );
  };

  const components = {
    code: CodeBlock,
    h1: ({ children, id }: HeadingProps) => (
      <h1 
        id={id} 
        className={`text-[24px] font-bold mt-8 mb-3 scroll-mt-20 group ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}
        onClick={() => id && document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="cursor-pointer">
          {children}
          {id && (
            <span className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500">
              #
            </span>
          )}
        </span>
      </h1>
    ),
    h2: ({ children, id }: HeadingProps) => (
      <h2 
        id={id} 
        className={`text-2xl font-bold mt-6 mb-4 scroll-mt-20 group ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}
        onClick={() => id && document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="cursor-pointer">
          {children}
          {id && (
            <span className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500">
              #
            </span>
          )}
        </span>
      </h2>
    ),
    h3: ({ children, id }: HeadingProps) => (
      <h3 
        id={id} 
        className={`text-xl font-bold mt-5 mb-3 scroll-mt-20 group ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}
        onClick={() => id && document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="cursor-pointer">
          {children}
          {id && (
            <span className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500">
              #
            </span>
          )}
        </span>
      </h3>
    ),
    h4: ({ children, id }: HeadingProps) => (
      <h4 
        id={id} 
        className={`text-lg font-bold mt-4 mb-2 scroll-mt-20 group ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}
        onClick={() => id && document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="cursor-pointer">
          {children}
          {id && (
            <span className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500">
              #
            </span>
          )}
        </span>
      </h4>
    ),
    p: ({ children, node }: ParagraphProps) => {
      if (node?.children.some(child => 
        child.type === 'element' && 
        (child.tagName === 'code' || child.tagName === 'pre' || 
         child.tagName === 'div' || child.tagName === 'img' ||
         child.tagName === 'span')
      )) {
        return <>{children}</>;
      }
      if (node?.parent?.type === 'element' && 
          (node.parent.tagName === 'p' || 
           node.parent.tagName === 'blockquote' || 
           node.parent.tagName === 'li')) {
        return <>{children}</>;
      }
      return (
        <p className={`text-base my-3 leading-relaxed ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
          {children}
        </p>
      );
    },
    ul: ({ children }: ListProps) => (
      <ul className={`list-disc list-inside my-3 space-y-2 text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
        {children}
      </ul>
    ),
    ol: ({ children }: ListProps) => (
      <ol className={`list-decimal list-inside my-3 space-y-2 text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
        {children}
      </ol>
    ),
    li: ({ children }: ListProps) => (
      <li className={`ml-4 text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
        {children}
      </li>
    ),
    blockquote: ({ children }: ListProps) => (
      <blockquote className={`border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith('#')) {
        return (
          <span
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(href.slice(1));
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity no-underline cursor-pointer"
          >
            {children}
          </span>
        );
      }
      
      return (
        <a
          href={href}
          className="text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity no-underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },
    img: ({ src, alt }) => {
      if (!src) return null;
      
      return (
        <span className="block my-6">
          <div className="relative w-full aspect-[16/9]">
            <Image
              src={src}
              alt={alt || ''}
              fill
              className="rounded-lg object-cover"
              sizes="(max-width: 800px) 100vw, 800px"
            />
          </div>
          {alt && (
            <span className="block text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              {alt}
            </span>
          )}
        </span>
      );
    },
    hr: () => (
      <hr className={`my-8 border-t ${
        theme === 'dark'
          ? 'border-gray-800'
          : 'border-gray-300'
      }`} />
    ),
  } as Components;

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
          <div className="relative w-full max-w-[850px] h-[200px] sm:h-[300px] md:h-[400px]">
            <Image
              src={project.mainPhoto}
              alt={project.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1000px) 100vw, 1000px"
            />
          </div>
        </div>

        <div className="relative mt-4 sm:mt-8 w-full max-w-[800px] mx-auto px-4">
          <div className={`w-full backdrop-blur-sm rounded-xl shadow-sm mx-auto px-4 py-3 ${
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

      <main className="w-full max-[820px]:px-6 pt-8 pb-16">
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
              components={components}
            >
              {project.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
} 