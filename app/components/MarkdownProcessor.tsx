'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import remarkToc from 'remark-toc';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';
import 'katex/dist/katex.min.css';

interface MarkdownProcessorProps {
  content: string;
  components: Components;
  className?: string;
}

const MarkdownProcessor = memo(function MarkdownProcessor({
  content,
  components,
  className = 'prose max-w-none'
}: MarkdownProcessorProps) {
  // Process content with all custom transformations
  const processedContent = useMemo(() => {
    let processed = content;

    // Process concept checks: ?[question](answer) -> custom component
    processed = processed.replace(
      /\?\[(.*?)\]\((.*?)\)/g, 
      '<div data-concept-check="true" data-question="$1" data-answer="$2"></div>'
    );

    // Process callouts: >[!type] title -> custom component
    processed = processed.replace(
      />\s*\[!(.*?)\](.*?)\n((?:>.*(?:\n|$))*)/g,
      (_, type, title, content) => {
        const cleanContent = content
          .split('\n')
          .map((line: string) => line.startsWith('>') ? line.slice(1).trim() : line.trim())
          .filter((line: string) => line)
          .join('\n');
        
        return `<div data-callout="true" data-type="${type.trim()}" data-title="${title.trim()}">\n${cleanContent}\n</div>`;
      }
    );

    return processed;
  }, [content]);

  // Memoize plugins configuration
  const remarkPlugins = useMemo(() => [
    remarkGfm,
    remarkMath,
    remarkEmoji,
    [remarkToc, { heading: 'table of contents', tight: true }]
  ], []);
  
  const rehypePlugins = useMemo(() => [
    rehypeKatex,
    rehypeSlug,
    rehypeRaw
  ], []);

  return (
    <div className={className} suppressHydrationWarning>
      <ReactMarkdown
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remarkPlugins={remarkPlugins as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rehypePlugins={rehypePlugins as any}
        components={components}
        remarkRehypeOptions={{
          allowDangerousHtml: true,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownProcessor;