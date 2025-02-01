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
import type { BlogPost } from '@/app/utils/getBlogPosts';
import type { Components } from 'react-markdown';
import { createElement } from 'react';
import ConceptCheck from './components/ConceptCheck';
import Callout from './components/Callout';
import rehypeReact from 'rehype-react';
import rehypeRaw from 'rehype-raw';

interface BlogPostClientProps {
  post: BlogPost;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface CalloutProps {
  type: string;
  title?: string;
  children: React.ReactNode;
}

interface CustomComponents extends Components {
  Callout: React.ComponentType<CalloutProps>;
  ConceptCheck: React.ComponentType<ConceptCheckProps>;
}

interface ConceptCheckData {
  type: 'concept-check';
  question: string;
  answer: string;
}

interface ConceptCheckProps {
  question: string;
  answer: string;
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

interface HeadingProps {
  children: React.ReactNode;
  id?: string;
}

interface ListProps {
  children: React.ReactNode;
}

interface DivProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
  'data-type'?: string;
  'data-title'?: string;
  'data-question'?: string;
  'data-answer'?: string;
}

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const { theme, toggleTheme } = useTheme();

  const CodeBlock = ({ inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || '');
    if (inline) {
      return (
        <code
          className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <div className="relative group">
        <pre className={`${
          match ? `language-${match[1]}` : ''
        } p-5 rounded-lg overflow-auto bg-[#1A1A1E] text-[#EEEEEE] text-sm font-mono my-4 border border-gray-800`}>
          <div className="absolute top-3 right-3 flex gap-2">
            {match && (
              <div className="px-2 py-1 rounded text-xs text-white/60 bg-white/10 font-mono">
                {match[1]}
              </div>
            )}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(children as string);
                }
              }}
              className="px-2 py-1 rounded text-xs text-white/60 bg-white/10 hover:bg-white/20 transition-colors"
            >
              Copy
            </button>
          </div>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  };

  const Callout = ({ type, title, children }: CalloutProps) => {
    type CalloutType = 'note' | 'abstract' | 'summary' | 'tldr' | 'info' | 'todo' | 'tip' | 'hint' | 'important' | 
      'success' | 'check' | 'done' | 'question' | 'help' | 'faq' | 'warning' | 'caution' | 'attention' | 
      'failure' | 'fail' | 'missing' | 'danger' | 'error' | 'bug' | 'example' | 'quote' | 'cite';

    const getCalloutStyles = (type: string) => {
      const baseStyles = "rounded-lg p-4 my-4 border";
      const typeStyles: Record<CalloutType, string> = {
        'note': 'bg-blue-900/30 border-blue-500/30',
        'abstract': 'bg-green-900/30 border-green-500/30',
        'summary': 'bg-green-900/30 border-green-500/30',
        'tldr': 'bg-green-900/30 border-green-500/30',
        'info': 'bg-blue-900/30 border-blue-500/30',
        'todo': 'bg-blue-900/30 border-blue-500/30',
        'tip': 'bg-sky-900/30 border-sky-500/30',
        'hint': 'bg-sky-900/30 border-sky-500/30',
        'important': 'bg-sky-900/30 border-sky-500/30',
        'success': 'bg-green-900/30 border-green-500/30',
        'check': 'bg-green-900/30 border-green-500/30',
        'done': 'bg-green-900/30 border-green-500/30',
        'question': 'bg-yellow-900/30 border-yellow-500/30',
        'help': 'bg-yellow-900/30 border-yellow-500/30',
        'faq': 'bg-yellow-900/30 border-yellow-500/30',
        'warning': 'bg-orange-900/30 border-orange-500/30',
        'caution': 'bg-orange-900/30 border-orange-500/30',
        'attention': 'bg-orange-900/30 border-orange-500/30',
        'failure': 'bg-red-900/30 border-red-500/30',
        'fail': 'bg-red-900/30 border-red-500/30',
        'missing': 'bg-red-900/30 border-red-500/30',
        'danger': 'bg-red-900/30 border-red-500/30',
        'error': 'bg-red-900/30 border-red-500/30',
        'bug': 'bg-red-900/30 border-red-500/30',
        'example': 'bg-purple-900/30 border-purple-500/30',
        'quote': 'bg-gray-800/50 border-gray-500/30',
        'cite': 'bg-gray-800/50 border-gray-500/30'
      };
      return `${baseStyles} ${typeStyles[type.toLowerCase() as CalloutType] || typeStyles['note']}`;
    };

    const getIcon = (type: string) => {
      const icons: Record<CalloutType, string> = {
        'note': '📝',
        'abstract': '📑',
        'summary': '📑',
        'tldr': '📑',
        'info': 'ℹ️',
        'todo': '📋',
        'tip': '💡',
        'hint': '💡',
        'important': '💡',
        'success': '✅',
        'check': '✅',
        'done': '✅',
        'question': '❓',
        'help': '❓',
        'faq': '❓',
        'warning': '⚠️',
        'caution': '⚠️',
        'attention': '⚠️',
        'failure': '❌',
        'fail': '❌',
        'missing': '❌',
        'danger': '⚠️',
        'error': '⚠️',
        'bug': '🐛',
        'example': '💭',
        'quote': '💬',
        'cite': '💬'
      };
      return icons[type.toLowerCase() as CalloutType] || icons['note'];
    };

    return (
      <div className={getCalloutStyles(type)}>
        <div className="font-medium text-base mb-2 text-white/90 flex items-center gap-2">
          <span>{getIcon(type)}</span>
          <span className="uppercase">{title || type}</span>
        </div>
        <div className="text-white/80">
          {children}
        </div>
      </div>
    );
  };

  const processConceptChecks = (content: string) => {
    const conceptCheckRegex = /\?\[(.*?)\]\((.*?)\)/g;
    return content.replace(conceptCheckRegex, (_, question, answer) => {
      return `<ConceptCheck question="${question.trim()}" answer="${answer.trim()}" />`;
    });
  };

  const processCallouts = (content: string) => {
    const calloutRegex = />\s*\[!(.*?)\](.*?)\n((?:>.*(?:\n|$))*)/g;
    return content.replace(calloutRegex, (_, type, title, content) => {
      const processedContent = content
        .split('\n')
        .map((line: string) => line.startsWith('>') ? line.slice(1).trim() : line.trim())
        .filter((line: string) => line)
        .join('\n');
      
      return `<div class="callout" data-type="${type.trim()}" data-title="${title.trim()}">${processedContent}</div>`;
    });
  };

  const processContent = (content: string) => {
    let processedContent = content;
    processedContent = processConceptChecks(processedContent);
    processedContent = processCallouts(processedContent);
    return processedContent;
  };

  const processedContent = processContent(post.content);

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
        className={`text-[20px] font-bold mt-6 mb-2 scroll-mt-20 group ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}
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
        className={`text-[18px] font-bold mt-5 mb-2 scroll-mt-20 group ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}
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
        className={`text-[16px] font-bold mt-4 mb-2 scroll-mt-20 group ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}
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
      // Check if this paragraph contains a code block, image, or div
      if (node?.children.some(child => 
        child.type === 'element' && 
        (child.tagName === 'code' || child.tagName === 'pre' || 
         child.tagName === 'div' || child.tagName === 'img' ||
         child.tagName === 'span')
      )) {
        return <>{children}</>;
      }
      // Check if parent is already a paragraph or if we're inside another block element
      if (node?.parent?.type === 'element' && 
          (node.parent.tagName === 'p' || 
           node.parent.tagName === 'blockquote' || 
           node.parent.tagName === 'li')) {
        return <>{children}</>;
      }
      return (
        <p className={`text-[14px] my-2 leading-6 ${theme === 'dark' ? 'text-[#EEEEEE]/80' : 'text-[#1A1A1E]/80'}`}>
          {children}
        </p>
      );
    },
    ul: ({ children }: ListProps) => (
      <ul className={`list-disc list-inside my-3 space-y-1.5 text-[14px] ${theme === 'dark' ? 'text-[#EEEEEE]/80' : 'text-[#1A1A1E]/80'}`}>
        {children}
      </ul>
    ),
    ol: ({ children }: ListProps) => (
      <ol className={`list-decimal list-inside my-3 space-y-1.5 text-[14px] ${theme === 'dark' ? 'text-[#EEEEEE]/80' : 'text-[#1A1A1E]/80'}`}>
        {children}
      </ol>
    ),
    li: ({ children }: ListProps) => (
      <li className={`ml-4 ${theme === 'dark' ? 'text-[#EEEEEE]/80' : 'text-[#1A1A1E]/80'}`}>
        {children}
      </li>
    ),
    blockquote: ({ children }: ListProps) => (
      <blockquote className={`border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-3 italic text-[14px] ${theme === 'dark' ? 'text-[#EEEEEE]/70' : 'text-[#1A1A1E]/70'}`}>
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => {
      // Check if this is a table of contents link (starts with #)
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
      
      // External links
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
    Callout: ({ type, title, children }) => (
      <Callout type={type} title={title}>{children}</Callout>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-100 dark:bg-gray-800">
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm">
        {children}
      </td>
    ),
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
      <hr className="my-8 border-t border-gray-200 dark:border-gray-800" />
    ),
    ConceptCheck: ({ question, answer }) => (
      <ConceptCheck question={question} answer={answer} />
    ),
    div: ({ className, children, ...props }: DivProps) => {
      if (className?.includes('callout')) {
        const type = props['data-type'] || 'note';
        const title = props['data-title'] || '';
        return <Callout type={type} title={title}>{children}</Callout>;
      }
      return <div className={className}>{children}</div>;
    },
  } as CustomComponents;

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-[#0D0D0F]' : 'bg-[rgb(253,253,253)]'}`}>
      <button
        onClick={toggleTheme}
        className={`fixed top-8 right-8 z-50 h-10 w-10 flex items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
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
        href="/blog"
        className={`fixed top-8 left-8 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm transition-colors ${
          theme === 'dark'
            ? 'bg-black/20 hover:bg-black/30 text-white'
            : 'bg-gray-200/50 hover:bg-gray-200/80 text-gray-700'
        }`}
      >
        ← Back to blog
      </Link>

      <div className="relative">
        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-[1000px] h-[500px]">
            <Image
              src={post.mainPhoto}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/4 w-full max-w-[800px]">
          <div className={`w-full backdrop-blur-sm rounded-xl shadow-lg mx-auto px-8 py-7 ${
            theme === 'dark'
              ? 'bg-[#0D0D0F]/95'
              : 'bg-white/95'
          }`}>
            <div className="text-center">
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                {post.date}
              </p>
              <h1 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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

      <main className="w-full max-[820px]:px-6 pt-32 pb-16">
        <article className="max-w-[800px] mx-auto" onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('concept-check-answer')) {
            target.classList.toggle('blur-sm');
            target.classList.toggle('hover:blur-[2px]');
          }
        }}>
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
              {processedContent}
            </ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
}
