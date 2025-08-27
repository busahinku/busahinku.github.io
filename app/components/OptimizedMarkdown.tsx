'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkEmoji from 'remark-emoji';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

interface OptimizedMarkdownProps {
  content: string;
  components?: Components;
  enableMath?: boolean;
  enableEmoji?: boolean;
  enableTables?: boolean;
}

const OptimizedMarkdown = memo(function OptimizedMarkdown({
  content,
  components = {},
  enableMath = true,
  enableEmoji = true,
  enableTables = true
}: OptimizedMarkdownProps) {
  // Memoize plugin configuration for performance
  const { remarkPlugins, rehypePlugins } = useMemo(() => {
    const remarkPlugins = [];
    const rehypePlugins = [];

    if (enableTables) {
      remarkPlugins.push(remarkGfm);
    }
    
    if (enableMath) {
      remarkPlugins.push(remarkMath);
      rehypePlugins.push(rehypeKatex);
    }
    
    if (enableEmoji) {
      remarkPlugins.push(remarkEmoji);
    }

    rehypePlugins.push(rehypeSlug, rehypeRaw);

    return { remarkPlugins, rehypePlugins };
  }, [enableMath, enableEmoji, enableTables]);

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
      className="prose dark:prose-invert max-w-none"
    >
      {content}
    </ReactMarkdown>
  );
});

export default OptimizedMarkdown;