'use client';

import { useState, useEffect } from 'react';
import { generateTableOfContents, shouldShowTOC, type TOCItem } from '@/app/utils/tableOfContents';

interface SimpleTOCProps {
  content: string;
  className?: string;
}

export default function SimpleTOC({ content, className = '' }: SimpleTOCProps) {
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Generate TOC from content
  useEffect(() => {
    if (!shouldShowTOC(content, 2)) {
      setTocItems([]);
      return;
    }

    const toc = generateTableOfContents(content);
    setTocItems(toc);
  }, [content]);

  // Track active heading
  useEffect(() => {
    if (tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0% -35% 0%',
        threshold: 0
      }
    );

    // Observe all headings
    const getAllIds = (items: TOCItem[]): string[] => {
      const ids: string[] = [];
      items.forEach(item => {
        ids.push(item.id);
        if (item.children) {
          ids.push(...getAllIds(item.children));
        }
      });
      return ids;
    };

    const allIds = getAllIds(tocItems);

    allIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [tocItems]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const navbarHeight = 80; // Approximate navbar height
      const elementPosition = element.offsetTop - navbarHeight;

      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });

      // Update URL hash without triggering navigation
      history.replaceState(null, '', `#${id}`);
    }
  };

  const renderTOCItem = (item: TOCItem, depth = 0) => {
    const isActive = activeId === item.id;
    const paddingLeft = depth * 16;

    return (
      <div key={item.id}>
        <button
          onClick={() => handleClick(item.id)}
          className={`w-full text-left py-1 px-2 rounded text-sm transition-all duration-200 hover:scale-[1.02] ${
            isActive
              ? 'text-blue-600 bg-blue-50 font-medium border-l-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent'
          }`}
          style={{ paddingLeft: `${8 + paddingLeft}px` }}
        >
          {item.title}
        </button>

        {item.children && item.children.length > 0 && (
          <div className="ml-2">
            {item.children.map(child => renderTOCItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <div className={`sticky top-24 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 max-h-[70vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Table of Contents
        </h3>

        <nav className="space-y-1">
          {tocItems.map(item => renderTOCItem(item))}
        </nav>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {tocItems.length} section{tocItems.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}