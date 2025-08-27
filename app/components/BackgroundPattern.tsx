'use client';

import { memo } from 'react';
import { useTheme } from '../context/ThemeContext';

interface BackgroundPatternProps {
  variant?: 'interactive' | 'simple' | 'minimal';
  mousePosition?: { x: number; y: number };
}

const BackgroundPattern = memo(function BackgroundPattern({ 
  variant = 'simple', 
  mousePosition = { x: 50, y: 50 } 
}: BackgroundPatternProps) {
  const { theme } = useTheme();

  if (variant === 'interactive') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary interactive orbs with subtle animations */}
        <div 
          className={`interactive-orb absolute w-80 h-80 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-violet-500/5 to-purple-500/5' 
              : 'bg-gradient-to-r from-violet-200/20 to-purple-200/15'
          } rounded-full blur-3xl transition-all duration-1000 ease-out animate-gentle-float`}
          style={{
            left: `${20 + (mousePosition.x - 50) * 0.05}%`,
            top: `${15 + (mousePosition.y - 50) * 0.03}%`,
            transform: `scale(${1 + (mousePosition.x / 100) * 0.05})`
          }}
        />

        <div 
          className={`interactive-orb absolute w-70 h-70 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-cyan-500/5 to-teal-500/5' 
              : 'bg-gradient-to-r from-cyan-200/15 to-teal-200/10'
          } rounded-full blur-3xl transition-all duration-1200 ease-out animate-gentle-float-delayed`}
          style={{
            right: `${25 + (mousePosition.x - 50) * -0.04}%`,
            top: `${25 + (mousePosition.y - 50) * 0.03}%`,
            transform: `scale(${1 + (mousePosition.y / 100) * 0.04})`
          }}
        />

        <div 
          className={`interactive-orb absolute w-60 h-60 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-emerald-500/5 to-green-500/5' 
              : 'bg-gradient-to-r from-emerald-200/15 to-green-200/10'
          } rounded-full blur-3xl transition-all duration-900 ease-out animate-gentle-float-slow`}
          style={{
            left: `${30 + (mousePosition.x - 50) * 0.03}%`,
            bottom: `${20 + (mousePosition.y - 50) * -0.02}%`,
            transform: `scale(${1 + ((100 - mousePosition.x) / 100) * 0.03})`
          }}
        />

        {/* Interactive micro particles */}
        <div 
          className={`interactive-orb absolute w-24 h-24 ${
            theme === 'dark' ? 'bg-rose-500/20' : 'bg-rose-200/40'
          } rounded-full blur-2xl transition-all duration-700 ease-out animate-sparkle`}
          style={{
            right: `${20 + (mousePosition.x - 50) * -0.06}%`,
            top: `${45 + (mousePosition.y - 50) * 0.04}%`,
            opacity: 0.3 + (mousePosition.x / 100) * 0.2
          }}
        />

        <div 
          className={`interactive-orb absolute w-20 h-20 ${
            theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-200/40'
          } rounded-full blur-xl transition-all duration-800 ease-out animate-sparkle-delayed`}
          style={{
            left: `${60 + (mousePosition.x - 50) * 0.08}%`,
            bottom: `${35 + (mousePosition.y - 50) * -0.05}%`,
            opacity: 0.2 + (mousePosition.y / 100) * 0.15
          }}
        />

        {/* Interactive mesh overlay */}
        <div 
          className={`absolute inset-0 transition-opacity duration-1000 ${
            theme === 'dark' ? 'opacity-5' : 'opacity-10'
          }`} 
          style={{
            opacity: 0.05 + (mousePosition.x / 100) * 0.08,
            backgroundImage: `
              radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, ${theme === 'dark' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.08)'} 0%, transparent 50%), 
              radial-gradient(circle at ${100 - mousePosition.x}% ${100 - mousePosition.y}%, ${theme === 'dark' ? 'rgba(59, 130, 246, 0.03)' : 'rgba(59, 130, 246, 0.05)'} 0%, transparent 50%)
            `
          }}
        />

        {/* Enhanced starfield with better distribution */}
        <div 
          className={`starfield-bg absolute inset-0 transition-all duration-500 animate-gentle-twinkle ${theme === 'dark' ? 'opacity-20' : 'opacity-30'}`} 
          style={{
            transform: `translate(${(mousePosition.x - 50) * 0.01}px, ${(mousePosition.y - 50) * 0.01}px)`,
            backgroundImage: `
              radial-gradient(circle at 15% 25%, ${theme === 'dark' ? 'white' : '#666'} 0.3px, transparent 0.3px),
              radial-gradient(circle at 85% 15%, ${theme === 'dark' ? 'white' : '#666'} 0.4px, transparent 0.4px),
              radial-gradient(circle at 95% 35%, ${theme === 'dark' ? 'white' : '#666'} 0.2px, transparent 0.2px),
              radial-gradient(circle at 75% 55%, ${theme === 'dark' ? 'white' : '#666'} 0.5px, transparent 0.5px),
              radial-gradient(circle at 90% 75%, ${theme === 'dark' ? 'white' : '#666'} 0.3px, transparent 0.3px),
              radial-gradient(circle at 65% 85%, ${theme === 'dark' ? 'white' : '#666'} 0.2px, transparent 0.2px)
            `,
            backgroundSize: '200px 200px, 180px 180px, 160px 160px, 220px 220px, 190px 190px, 170px 170px'
          }}
        />
      </div>
    );
  }

  if (variant === 'simple') {
    return (
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${
          theme === 'dark' ? 'bg-[#0D0D0F]' : 'bg-white'
        }`} />
        
        {/* Floating Orbs - Only for dark mode with reduced opacity */}
        {theme === 'dark' && (
          <>
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-5 bg-purple-500 animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-4 bg-blue-500 animate-float-delayed" />
            <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full blur-2xl opacity-6 bg-cyan-500 animate-pulse" />
            <div className="absolute top-3/4 left-1/2 w-40 h-40 rounded-full blur-3xl opacity-3 bg-green-500 animate-float" />
          </>
        )}
      </div>
    );
  }

  // Minimal variant
  return (
    <div className="fixed inset-0 -z-10">
      <div className={`absolute inset-0 ${
        theme === 'dark' ? 'bg-[#0D0D0F]' : 'bg-white'
      }`} />
    </div>
  );
});

export default BackgroundPattern;