'use client';

import { useState, useEffect, useRef } from 'react';
import { generateTableOfContents, shouldShowTOC, getFlatHeadings } from '@/app/utils/tableOfContents';

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

  // Extract headings from markdown using the utility function
  useEffect(() => {
    // Check if content has enough headings to show TOC
    if (!shouldShowTOC(content, 2)) {
      setTocItems([]);
      return;
    }

    // Generate TOC structure
    const tocStructure = generateTableOfContents(content);

    // Convert to flat list for the current UI
    const flatHeadings = getFlatHeadings(tocStructure);

    // Convert to the format expected by this component
    const items: TOCItem[] = flatHeadings
      .filter(item => item.level <= 3) // Only show H1, H2, H3
      .map(item => ({
        id: item.id,
        text: item.title,
        level: item.level
      }));

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

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    startScroll.current = scrollPosition;
    e.preventDefault();
  };

  // Event listeners
  useEffect(() => {
    const handleMouseMoveLocal = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX.current;
      const newPosition = startScroll.current + deltaX;
      setScrollPosition(newPosition);

      // Update active index based on position immediately
      const targetIndex = Math.round(-newPosition / 180);
      const clampedIndex = Math.max(0, Math.min(targetIndex, tocItems.length - 1));
      setActiveIndex(clampedIndex);
    };

    const handleMouseUpLocal = () => {
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

    const handleTouchMoveLocal = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.touches[0].clientX - startX.current;
      const newPosition = startScroll.current + deltaX;
      setScrollPosition(newPosition);

      const targetIndex = Math.round(-newPosition / 180);
      const clampedIndex = Math.max(0, Math.min(targetIndex, tocItems.length - 1));
      setActiveIndex(clampedIndex);
      e.preventDefault();
    };

    const handleTouchEndLocal = () => {
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

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMoveLocal);
      document.addEventListener('mouseup', handleMouseUpLocal);
      document.addEventListener('touchmove', handleTouchMoveLocal, { passive: false });
      document.addEventListener('touchend', handleTouchEndLocal);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveLocal);
      document.removeEventListener('mouseup', handleMouseUpLocal);
      document.removeEventListener('touchmove', handleTouchMoveLocal);
      document.removeEventListener('touchend', handleTouchEndLocal);
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
