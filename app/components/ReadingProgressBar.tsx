'use client';

import { useState, useEffect } from 'react';

interface ReadingProgressBarProps {
  theme: 'light' | 'dark';
  totalReadingMinutes?: number;
}

export default function ReadingProgressBar({
  theme,
  totalReadingMinutes = 0
}: ReadingProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const totalScroll = docHeight - winHeight;

      if (totalScroll > 0) {
        const currentProgress = (scrollTop / totalScroll) * 100;
        setProgress(Math.round(currentProgress));
      }
    };

    let rafId: number;
    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(calculateProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    calculateProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const timeLeft = totalReadingMinutes > 0
    ? Math.max(0, Math.ceil(totalReadingMinutes * (100 - progress) / 100))
    : 0;

  return (
    <>
      {/* Progress bar background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          zIndex: 9998,
          pointerEvents: 'none'
        }}
      />

      {/* Progress bar fill */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${progress}%`,
          height: '2px',
          background: theme === 'dark'
            ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
            : 'linear-gradient(90deg, #2563eb, #7c3aed)',
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'width 0.1s ease'
        }}
      />

      {/* Time indicator */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
          color: theme === 'dark' ? '#fff' : '#000',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        {progress}%{timeLeft > 0 && ` • ${timeLeft} min`}
      </div>
    </>
  );
}
