'use client';

import { useTheme } from '@/app/context/ThemeContext';
import Image from 'next/image';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useState } from 'react';

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

interface ComponentProps {
  children?: React.ReactNode;
  node?: unknown;
  inline?: boolean;
  className?: string;
  href?: string;
  src?: string;
  alt?: string;
  id?: string;
}

interface CustomComponents {
  [key: string]: React.ComponentType<ComponentProps>;
}

interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface AnchorProps {
  href?: string;
  children: React.ReactNode;
}

interface ImageProps {
  src?: string;
  alt?: string;
}

const Code = ({ inline, className, children, ...props }: CodeProps) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = async () => {
    if (typeof children === 'string') {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (inline) {
    return (
      <code
        className={`${className} px-1.5 py-0.5 rounded-md text-sm ${
          theme === 'dark'
            ? 'bg-white/10 text-pink-400'
            : 'bg-black/5 text-pink-600'
        }`}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className={`absolute right-4 top-4 px-2 py-1 text-xs rounded-md transition-colors opacity-0 group-hover:opacity-100 ${
          theme === 'dark'
            ? 'bg-white/10 text-white/60 hover:bg-white/20'
            : 'bg-black/5 text-black/60 hover:bg-black/10'
        }`}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <SyntaxHighlighter
        language={language}
        style={theme === 'dark' ? {} : {}}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          lineHeight: '1.5rem',
          backgroundColor: theme === 'dark' ? '#1A1A1E' : '#F8F8F8',
        }}
        showLineNumbers={false}
        wrapLines={false}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};

const H1 = ({ children, id }: HeadingProps) => {
  const { theme } = useTheme();
  return (
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
  );
};

const H2 = ({ children, id }: HeadingProps) => {
  const { theme } = useTheme();
  return (
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
  );
};

const H3 = ({ children, id }: HeadingProps) => {
  const { theme } = useTheme();
  return (
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
  );
};

const H4 = ({ children, id }: HeadingProps) => {
  const { theme } = useTheme();
  return (
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
  );
};

const P = ({ children, node }: ParagraphProps) => {
  const { theme } = useTheme();
  if (node?.children.some((child) => 
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
};

const Ul = ({ children }: ListProps) => {
  const { theme } = useTheme();
  return (
    <ul className={`list-disc list-inside my-3 space-y-2 text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
      {children}
    </ul>
  );
};

const Ol = ({ children }: ListProps) => {
  const { theme } = useTheme();
  return (
    <ol className={`list-decimal list-inside my-3 space-y-2 text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
      {children}
    </ol>
  );
};

const Li = ({ children }: ListProps) => {
  const { theme } = useTheme();
  return (
    <li className={`ml-4 text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
      {children}
    </li>
  );
};

const Blockquote = ({ children }: ListProps) => {
  const { theme } = useTheme();
  return (
    <blockquote className={`border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-base ${theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'}`}>
      {children}
    </blockquote>
  );
};

const A = ({ href, children }: AnchorProps) => {
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
};

const Img = ({ src, alt }: ImageProps) => {
  if (!src) return null;
  
  return (
    <div className="block my-6 w-full">
      <img
        src={src}
        alt={alt || ''}
        className="rounded-lg max-w-full h-auto mx-auto block"
        style={{ maxWidth: '800px' }}
      />
      {alt && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          {alt}
        </div>
      )}
    </div>
  );
};

const Hr = () => {
  const { theme } = useTheme();
  return (
    <hr className={`my-8 border-t ${
      theme === 'dark'
        ? 'border-gray-800'
        : 'border-gray-300'
    }`} />
  );
};

export const markdownComponents = {
  code: Code,
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  blockquote: Blockquote,
  a: A,
  img: Img,
  hr: Hr,
} as CustomComponents; 