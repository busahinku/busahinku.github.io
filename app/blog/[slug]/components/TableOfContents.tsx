'use client';

import { useState, useEffect, useRef } from 'react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  theme: 'light' | 'dark';
}

export default function TableOfContents({ content, theme }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startScroll = useRef(0);

  // Extract only H1 and H2 headings from markdown
  useEffect(() => {
    const lines = content.split('\n');
    const items: TOCItem[] = [];
    
    for (const line of lines) {
      // Match ## headings (H2) and # headings (H1)
      const h2Match = line.match(/^##\s+(.+)$/);
      const h1Match = line.match(/^#\s+(.+)$/);
      
      if (h1Match || h2Match) {
        const text = (h1Match?.[1] || h2Match?.[1] || '').trim();
        const level = h1Match ? 1 : 2;
        
        // Skip "Table of Contents" heading itself
        if (text.toLowerCase().includes('table of contents')) {
          continue;
        }
        
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-+/g, '-');
        
        if (text && id) {
          items.push({ id, text, level });
        }
      }
    }
    
    console.log('TOC items found:', items);
    setTocItems(items);
  }, [content]);

  // Track scroll position to update active section
  useEffect(() => {
    if (isDragging) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY + 150;
      let newActiveIndex = 0;

      for (let i = 0; i < tocItems.length; i++) {
        const element = document.getElementById(tocItems[i].id);
        if (element && element.offsetTop <= scrollTop) {
          newActiveIndex = i;
        }
      }

      setActiveIndex(newActiveIndex);
      setScrollPosition(-newActiveIndex * 180);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems, isDragging]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    startScroll.current = scrollPosition;
    e.preventDefault();
    document.body.style.userSelect = 'none'; // Prevent text selection
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX.current;
    const newPosition = startScroll.current + deltaX;
    setScrollPosition(newPosition);

    // Update active index based on position immediately
    const targetIndex = Math.round(-newPosition / 180);
    const clampedIndex = Math.max(0, Math.min(targetIndex, tocItems.length - 1));
    setActiveIndex(clampedIndex);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    document.body.style.userSelect = ''; // Restore text selection
    
    // Snap to nearest position
    const targetIndex = Math.round(-scrollPosition / 180);
    const clampedIndex = Math.max(0, Math.min(targetIndex, tocItems.length - 1));
    
    setActiveIndex(clampedIndex);
    setScrollPosition(-clampedIndex * 180);
    
    // Scroll to section
    const item = tocItems[clampedIndex];
    if (item) {
      const element = document.getElementById(item.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    startScroll.current = scrollPosition;
    e.preventDefault();
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.touches[0].clientX - startX.current;
    const newPosition = startScroll.current + deltaX;
    setScrollPosition(newPosition);

    const targetIndex = Math.round(-newPosition / 180);
    const clampedIndex = Math.max(0, Math.min(targetIndex, tocItems.length - 1));
    setActiveIndex(clampedIndex);
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const targetIndex = Math.round(-scrollPosition / 180);
    const clampedIndex = Math.max(0, Math.min(targetIndex, tocItems.length - 1));
    
    setActiveIndex(clampedIndex);
    setScrollPosition(-clampedIndex * 180);
    
    const item = tocItems[clampedIndex];
    if (item) {
      const element = document.getElementById(item.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, scrollPosition, tocItems]);

  // Click handler
  const handleClick = (index: number) => {
    setActiveIndex(index);
    setScrollPosition(-index * 180);
    
    const item = tocItems[index];
    if (item) {
      const element = document.getElementById(item.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  if (tocItems.length === 0) return null;

  return (
    <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-[800px] px-4 lg:px-0">
      <div
        ref={containerRef}
        className={`relative w-full h-12 rounded-full backdrop-blur-xl border shadow-lg cursor-grab select-none overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${
          theme === 'dark' 
            ? 'bg-black/20 border-white/10' 
            : 'bg-white/80 border-gray-200'
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div 
          className="flex items-center h-full"
          style={{ 
            transform: `translateX(${400 + scrollPosition}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          {tocItems.map((item, index) => {
            const isActive = index === activeIndex;
            const distance = Math.abs(index - activeIndex);
            
            let opacity = 1;
            if (distance === 1) opacity = 0.6;
            else if (distance === 2) opacity = 0.3;
            else if (distance > 2) opacity = 0.1;

            return (
              <div
                key={item.id}
                className="flex-shrink-0 flex items-center justify-center cursor-pointer"
                style={{ 
                  width: '180px',
                  opacity,
                  transition: isDragging ? 'none' : 'opacity 0.2s ease'
                }}
                onClick={() => handleClick(index)}
              >
                <span className={`text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap ${
                  isActive 
                    ? theme === 'dark' 
                      ? 'text-white bg-white/20' 
                      : 'text-gray-900 bg-gray-100'
                    : theme === 'dark' 
                      ? 'text-white/70' 
                      : 'text-gray-600'
                }`}>
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
