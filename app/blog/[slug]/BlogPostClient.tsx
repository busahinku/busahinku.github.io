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
import { useState, useEffect } from 'react';
import ConceptCheck from './components/ConceptCheck';
import rehypeRaw from 'rehype-raw';
import { Highlight, themes } from 'prism-react-renderer';
import LikeButton from './components/LikeButton';
import Comments from './components/Comments';

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
  'data-concept-check'?: boolean;
}

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const { theme, toggleTheme } = useTheme();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
      return `<div data-concept-check data-question="${question.trim()}" data-answer="${answer.trim()}"></div>`;
    });
  };

  const getCalloutIcon = (type: string) => {
    const icons: Record<string, string> = {
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
    return icons[type.toLowerCase()] || icons['note'];
  };

  const getCalloutStyle = (type: string) => {
    const styles: Record<string, { bg: string, border: string, lightBg: string, lightBorder: string }> = {
      'note': { bg: 'bg-blue-900/30', border: 'border-blue-500/30', lightBg: 'bg-blue-50', lightBorder: 'border-blue-200' },
      'warning': { bg: 'bg-orange-900/30', border: 'border-orange-500/30', lightBg: 'bg-orange-50', lightBorder: 'border-orange-200' },
      'important': { bg: 'bg-red-900/30', border: 'border-red-500/30', lightBg: 'bg-red-50', lightBorder: 'border-red-200' },
      'tip': { bg: 'bg-emerald-900/30', border: 'border-emerald-500/30', lightBg: 'bg-emerald-50', lightBorder: 'border-emerald-200' }
    };
    return styles[type.toLowerCase()] || styles['note'];
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
    Callout: ({ type, title, children }) => (
      <Callout type={type} title={title}>{children}</Callout>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto rounded-lg my-6">
        <table className={`min-w-full divide-y ${
          theme === 'dark' 
            ? 'divide-gray-700' 
            : 'divide-gray-200'
        }`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={`${
        theme === 'dark' 
          ? 'bg-gray-800' 
          : 'bg-gray-50'
      }`}>
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody className={`divide-y ${
        theme === 'dark' 
          ? 'divide-gray-700' 
          : 'divide-gray-200'
      }`}>
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className={`transition-colors ${
        theme === 'dark'
          ? 'hover:bg-gray-800/50'
          : 'hover:bg-gray-50'
      }`}>
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
        theme === 'dark'
          ? 'text-gray-400'
          : 'text-gray-500'
      }`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`px-4 py-3 text-sm whitespace-nowrap ${
        theme === 'dark'
          ? 'text-gray-300'
          : 'text-gray-700'
      }`}>
        {children}
      </td>
    ),
    img: ({ src, alt }) => {
      if (!src) return null;
      
      return (
        <div className="block my-6 w-full flex flex-col items-center">
          <div className="relative max-w-[800px] w-full">
            <Image
              src={src}
              alt={alt || ''}
              width={800}
              height={600}
              className="rounded-lg w-full h-auto object-contain"
              style={{ maxWidth: '100%', height: 'auto' }}
              sizes="(max-width: 800px) 100vw, 800px"
            />
          </div>
          {alt && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
              {alt}
            </div>
          )}
        </div>
      );
    },
    hr: () => (
      <hr className={`my-8 border-t ${
        theme === 'dark'
          ? 'border-gray-800'
          : 'border-gray-300'
      }`} />
    ),
    ConceptCheck: ({ question, answer }: ConceptCheckProps) => (
      <ConceptCheck question={question} answer={answer} />
    ),
    div: ({ className, children, ...props }: DivProps) => {
      if (props['data-concept-check'] !== undefined) {
        return (
          <ConceptCheck
            question={props['data-question'] || ''}
            answer={props['data-answer'] || ''}
          />
        );
      }
      if (className?.includes('callout')) {
        const type = props['data-type'] || 'note';
        const title = props['data-title'] || '';
        const style = getCalloutStyle(type);
        const content = (children as string).split('\n').map((line, i) => (
          <p key={i} className={`${theme === 'dark' ? 'text-white/80' : 'text-gray-700'} ${i > 0 ? 'mt-2' : ''}`}>
            {line}
          </p>
        ));

        return (
          <div className={`rounded-lg p-4 my-4 border ${theme === 'dark' ? `${style.bg} ${style.border}` : `${style.lightBg} ${style.lightBorder}`}`}>
            <div className={`font-medium text-base mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-white/90' : 'text-gray-900'}`}>
              <span>{getCalloutIcon(type)}</span>
              <span className="uppercase">{title || type}</span>
            </div>
            <div>
              {content}
            </div>
          </div>
        );
      }
      return <div className={className}>{children}</div>;
    },
  } as CustomComponents;

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
          
          <div className={`mt-16 pt-8 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div 
                className="g-recaptcha" 
                data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                data-callback="onRecaptchaVerified"
                data-size="invisible"
              ></div>
              <LikeButton slug={post.slug} theme={theme} />
              
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Share on X
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Share on Facebook
              </a>

              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Share on LinkedIn
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? copiedUrl
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
                    : copiedUrl
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
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

          <Comments slug={post.slug} theme={theme} />
        </article>
      </main>
    </div>
  );
}
