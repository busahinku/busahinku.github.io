'use client';

import React, { memo, useState } from 'react';
import Image from 'next/image';
import { Highlight, themes } from 'prism-react-renderer';
import { Components } from 'react-markdown';
import ConceptCheck from '../blog/[slug]/components/ConceptCheck';
import { Copy, Check, FileText, Lightbulb, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface MarkdownComponentsProps {
  theme: 'light' | 'dark';
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface CalloutProps {
  type: string;
  title?: string;
  children?: React.ReactNode;
}

interface HeadingProps {
  children?: React.ReactNode;
  id?: string;
}

interface BasicProps {
  children?: React.ReactNode;
}

interface ParagraphProps {
  children?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node?: any;
}

interface LinkProps {
  href?: string;
  children?: React.ReactNode;
}

interface ImageProps {
  src?: string;
  alt?: string;
}

interface DivProps extends React.HTMLAttributes<HTMLDivElement> {
  'data-concept-check'?: string;
  'data-question'?: string;
  'data-answer'?: string;
  'data-callout'?: string;
  'data-type'?: string;
  'data-title'?: string;
  children?: React.ReactNode;
}

const getCalloutConfig = (type: string) => {
  const configs = {
    note: { icon: <FileText className="w-5 h-5" />, colors: { dark: 'bg-blue-900/20 border-blue-500/30 text-blue-200', light: 'bg-blue-50 border-blue-200 text-blue-800' } },
    warning: { icon: <AlertTriangle className="w-5 h-5" />, colors: { dark: 'bg-orange-900/20 border-orange-500/30 text-orange-200', light: 'bg-orange-50 border-orange-200 text-orange-800' } },
    important: { icon: <AlertCircle className="w-5 h-5" />, colors: { dark: 'bg-red-900/20 border-red-500/30 text-red-200', light: 'bg-red-50 border-red-200 text-red-800' } },
    tip: { icon: <Lightbulb className="w-5 h-5" />, colors: { dark: 'bg-green-900/20 border-green-500/30 text-green-200', light: 'bg-green-50 border-green-200 text-green-800' } },
    info: { icon: <Info className="w-5 h-5" />, colors: { dark: 'bg-blue-900/20 border-blue-500/30 text-blue-200', light: 'bg-blue-50 border-blue-200 text-blue-800' } }
  };
  return configs[type.toLowerCase() as keyof typeof configs] || configs.note;
};

export const createMarkdownComponents = ({ theme }: MarkdownComponentsProps): Components => {
  const CodeBlock = memo(function CodeBlock({ inline, className, children, ...props }: CodeProps) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const code = String(children).replace(/\n$/, '');
    const isCopied = copiedCode === code;

    if (inline) {
      return (
        <code
          className={`px-1.5 py-0.5 rounded text-sm font-mono break-words ${
            theme === 'dark' 
              ? 'bg-gray-800 text-gray-200' 
              : 'bg-gray-100 text-gray-800'
          }`}
          {...props}
        >
          {children}
        </code>
      );
    }

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    // Return a fragment to avoid wrapper that might get nested in paragraphs
    return (
      <div className="relative group my-6">
        <Highlight
          theme={theme === 'dark' ? themes.nightOwl : themes.github}
          code={code}
          language={language || 'text'}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`p-4 rounded-lg overflow-auto text-sm font-mono border ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-700'
                  : 'bg-gray-50 border-gray-200'
              }`}
              style={style}
            >
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {language && (
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {language}
                  </span>
                )}
                <button
                  onClick={handleCopy}
                  className={`px-2 py-1 rounded text-xs transition-all duration-200 flex items-center gap-1.5 ${
                    theme === 'dark'
                      ? isCopied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : isCopied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  aria-label={isCopied ? 'Copied!' : 'Copy code'}
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? 'Copied!' : 'Copy'}
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
  });

  const Callout = memo(function Callout({ type, title, children }: CalloutProps) {
    const config = getCalloutConfig(type);
    
    return (
      <div className={`rounded-lg p-4 my-6 border ${config.colors[theme]}`} role="note" aria-label={`${type} callout`}>
        <div className="flex items-center gap-2 font-semibold text-base mb-2">
          <span role="img" aria-label={type}>{config.icon}</span>
          <span className="uppercase tracking-wide">{title || type}</span>
        </div>
        <div className="prose-sm">{children}</div>
      </div>
    );
  });

  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const mutedColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';

  // Smart paragraph component that handles content properly
  const SmartParagraph = ({ children }: ParagraphProps) => {
    // Just render as a normal paragraph - let the browser handle selection naturally
    return (
      <p className={`text-base leading-relaxed my-4 ${textColor}`}>
        {children}
      </p>
    );
  };

  return {
    // Headings with proper accessibility
    h1: ({ children, id }: HeadingProps) => (
      <h1 
        id={id}
        className={`text-3xl font-bold mt-8 mb-4 scroll-mt-20 ${textColor}`}
        tabIndex={id ? 0 : undefined}
      >
        {children}
        {id && (
          <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity" aria-label="Link to heading">
            #
          </a>
        )}
      </h1>
    ),
    
    h2: ({ children, id }: HeadingProps) => (
      <h2 
        id={id}
        className={`text-2xl font-bold mt-6 mb-3 scroll-mt-20 ${textColor}`}
        tabIndex={id ? 0 : undefined}
      >
        {children}
        {id && (
          <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity" aria-label="Link to heading">
            #
          </a>
        )}
      </h2>
    ),

    h3: ({ children, id }: HeadingProps) => (
      <h3 
        id={id}
        className={`text-xl font-bold mt-5 mb-2 scroll-mt-20 ${textColor}`}
        tabIndex={id ? 0 : undefined}
      >
        {children}
        {id && (
          <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity" aria-label="Link to heading">
            #
          </a>
        )}
      </h3>
    ),

    h4: ({ children, id }: HeadingProps) => (
      <h4 
        id={id}
        className={`text-lg font-bold mt-4 mb-2 scroll-mt-20 ${textColor}`}
        tabIndex={id ? 0 : undefined}
      >
        {children}
        {id && (
          <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity" aria-label="Link to heading">
            #
          </a>
        )}
      </h4>
    ),

    // Smart paragraph component that prevents invalid nesting
    p: SmartParagraph,

    // Lists with proper spacing
    ul: ({ children }: BasicProps) => (
      <ul className={`list-disc ml-6 my-4 space-y-2 ${textColor}`}>
        {children}
      </ul>
    ),

    ol: ({ children }: BasicProps) => (
      <ol className={`list-decimal ml-6 my-4 space-y-2 ${textColor}`}>
        {children}
      </ol>
    ),

    li: ({ children }: BasicProps) => (
      <li className={`text-base leading-relaxed ${textColor}`}>
        {children}
      </li>
    ),

    // Enhanced blockquotes
    blockquote: ({ children }: BasicProps) => (
      <blockquote className={`border-l-4 pl-4 my-6 italic ${
        theme === 'dark' 
          ? 'border-gray-600 text-gray-300' 
          : 'border-gray-300 text-gray-700'
      }`}>
        {children}
      </blockquote>
    ),

    // Improved links
    a: ({ href, children }: LinkProps) => {
      if (href?.startsWith('#')) {
        return (
          <button
            onClick={() => {
              const element = document.getElementById(href.slice(1));
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {children}
          </button>
        );
      }

      return (
        <a
          href={href}
          className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    },

    // Enhanced tables
    table: ({ children }: BasicProps) => (
      <div className="overflow-x-auto my-6">
        <table className={`min-w-full border-collapse ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
        }`}>
          {children}
        </table>
      </div>
    ),

    thead: ({ children }: BasicProps) => (
      <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
        {children}
      </thead>
    ),

    th: ({ children }: BasicProps) => (
      <th className={`px-4 py-3 text-left text-sm font-semibold border ${
        theme === 'dark' 
          ? 'border-gray-700 text-gray-200' 
          : 'border-gray-300 text-gray-800'
      }`}>
        {children}
      </th>
    ),

    td: ({ children }: BasicProps) => (
      <td className={`px-4 py-3 text-sm border ${
        theme === 'dark' 
          ? 'border-gray-700 text-gray-300' 
          : 'border-gray-300 text-gray-700'
      }`}>
        {children}
      </td>
    ),

    // Safe images that don't cause hydration errors
    img: ({ src, alt }: ImageProps) => {
      if (!src) return null;
      
      // Use a simple img tag to avoid hydration issues with figure/figcaption in paragraphs
      return (
        <span className="block my-8">
          <span className="block relative w-full max-w-4xl mx-auto">
            <Image
              src={src}
              alt={alt || ''}
              width={800}
              height={600}
              className="rounded-lg w-full h-auto object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
            />
          </span>
          {alt && (
            <span className={`block text-center text-sm mt-3 italic ${mutedColor}`}>
              {alt}
            </span>
          )}
        </span>
      );
    },

    hr: () => (
      <hr className={`my-8 border-t ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
      }`} />
    ),

    // Code component
    code: CodeBlock,

    // Custom div handler for callouts and concept checks
    div: ({ children, ...props }: DivProps) => {
      // Handle concept checks
      if (props['data-concept-check']) {
        return (
          <ConceptCheck
            question={props['data-question'] || ''}
            answer={props['data-answer'] || ''}
          />
        );
      }

      // Handle callouts
      if (props['data-callout']) {
        return (
          <Callout
            type={props['data-type'] || 'note'}
            title={props['data-title']}
          >
            {children}
          </Callout>
        );
      }

      return <div {...props} suppressHydrationWarning>{children}</div>;
    }
  };
};