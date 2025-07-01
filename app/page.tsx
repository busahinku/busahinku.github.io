'use client';

import { useTheme } from './context/ThemeContext';
import SocialGrid from './components/SocialGrid';
import { useState, useEffect } from 'react';


export default function Home() {
  const { theme } = useTheme();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [latestBlogTitle, setLatestBlogTitle] = useState<string>('Loading...');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const fetchLatestBlog = async () => {
      try {
        const response = await fetch('/api/latest-blog');
        
        // Check if response is ok and content-type is JSON
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }
        
        const data = await response.json();
        setLatestBlogTitle(data.title);
      } catch (error) {
        console.error('Error fetching latest blog post:', error);
        setLatestBlogTitle('Complete Markdown Features Test');
      }
    };

    fetchLatestBlog();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 max-[820px]:px-6 page-transition relative overflow-hidden min-h-screen">
      {/* Interactive Subtle Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                 {/* Primary interactive orbs with subtle animations */}
         <div 
           className={`absolute w-80 h-80 ${
          theme === 'dark' 
               ? 'bg-gradient-to-r from-violet-500/1 to-purple-500/1' 
               : 'bg-gradient-to-r from-violet-200/3 to-purple-200/2'
           } rounded-full blur-3xl transition-all duration-1000 ease-out animate-gentle-float animate-gentle-shine`}
           style={{
             left: `${20 + (mousePosition.x - 50) * 0.1}%`,
             top: `${15 + (mousePosition.y - 50) * 0.05}%`,
             transform: `scale(${1 + (mousePosition.x / 100) * 0.1})`
           }}
         ></div>

         <div 
           className={`absolute w-70 h-70 ${
          theme === 'dark' 
               ? 'bg-gradient-to-r from-cyan-500/1 to-teal-500/1' 
               : 'bg-gradient-to-r from-cyan-200/2 to-teal-200/1'
           } rounded-full blur-3xl transition-all duration-1200 ease-out animate-gentle-float-delayed animate-gentle-shine-delayed`}
           style={{
             right: `${25 + (mousePosition.x - 50) * -0.08}%`,
             top: `${25 + (mousePosition.y - 50) * 0.06}%`,
             transform: `scale(${1 + (mousePosition.y / 100) * 0.08})`
           }}
         ></div>

         <div 
           className={`absolute w-60 h-60 ${
          theme === 'dark' 
               ? 'bg-gradient-to-r from-emerald-500/1 to-green-500/1' 
               : 'bg-gradient-to-r from-emerald-200/2 to-green-200/1'
           } rounded-full blur-3xl transition-all duration-900 ease-out animate-gentle-float-slow animate-gentle-shine-slow`}
           style={{
             left: `${30 + (mousePosition.x - 50) * 0.06}%`,
             bottom: `${20 + (mousePosition.y - 50) * -0.04}%`,
             transform: `scale(${1 + ((100 - mousePosition.x) / 100) * 0.06})`
           }}
         ></div>

                 {/* Interactive micro particles */}
         <div 
           className={`absolute w-24 h-24 ${
             theme === 'dark' ? 'bg-rose-500/0.5' : 'bg-rose-200/1'
           } rounded-full blur-2xl transition-all duration-700 ease-out animate-sparkle`}
           style={{
             right: `${20 + (mousePosition.x - 50) * -0.12}%`,
             top: `${45 + (mousePosition.y - 50) * 0.08}%`,
             opacity: 0.3 + (mousePosition.x / 100) * 0.4
           }}
         ></div>

         <div 
           className={`absolute w-20 h-20 ${
             theme === 'dark' ? 'bg-amber-500/0.5' : 'bg-amber-200/1'
           } rounded-full blur-xl transition-all duration-800 ease-out animate-sparkle-delayed`}
           style={{
             left: `${60 + (mousePosition.x - 50) * 0.15}%`,
             bottom: `${35 + (mousePosition.y - 50) * -0.1}%`,
             opacity: 0.2 + (mousePosition.y / 100) * 0.3
           }}
         ></div>



        {/* Interactive mesh overlay */}
        <div 
          className={`absolute inset-0 transition-opacity duration-1000 ${
            theme === 'dark' ? 'opacity-2' : 'opacity-2'
          }`} 
          style={{
            opacity: 0.1 + (mousePosition.x / 100) * 0.15,
            backgroundImage: `
              radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, ${theme === 'dark' ? 'rgba(139, 92, 246, 0.02)' : 'rgba(139, 92, 246, 0.03)'} 0%, transparent 50%), 
              radial-gradient(circle at ${100 - mousePosition.x}% ${100 - mousePosition.y}%, ${theme === 'dark' ? 'rgba(59, 130, 246, 0.015)' : 'rgba(59, 130, 246, 0.02)'} 0%, transparent 50%)
            `
          }}
        ></div>

                 {/* Enhanced starfield with better distribution */}
         <div 
           className={`absolute inset-0 transition-all duration-500 animate-gentle-twinkle ${theme === 'dark' ? 'opacity-04' : 'opacity-10'}`} 
           style={{
             transform: `translate(${(mousePosition.x - 50) * 0.02}px, ${(mousePosition.y - 50) * 0.02}px)`,
             backgroundImage: `
               radial-gradient(circle at 15% 25%, white 0.4px, transparent 0.4px),
               radial-gradient(circle at 85% 15%, white 0.5px, transparent 0.5px),
               radial-gradient(circle at 95% 35%, white 0.3px, transparent 0.3px),
               radial-gradient(circle at 75% 55%, white 0.6px, transparent 0.6px),
               radial-gradient(circle at 90% 75%, white 0.4px, transparent 0.4px),
               radial-gradient(circle at 65% 85%, white 0.3px, transparent 0.3px),
               radial-gradient(circle at 25% 75%, white 0.5px, transparent 0.5px),
               radial-gradient(circle at 45% 15%, white 0.3px, transparent 0.3px),
               radial-gradient(circle at 35% 45%, white 0.4px, transparent 0.4px),
               radial-gradient(circle at 55% 65%, white 0.3px, transparent 0.3px),
               radial-gradient(circle at 12% 60%, white 0.4px, transparent 0.4px),
               radial-gradient(circle at 88% 45%, white 0.5px, transparent 0.5px)
             `,
             backgroundSize: '180px 180px, 160px 160px, 140px 140px, 200px 200px, 170px 170px, 150px 150px, 190px 190px, 130px 130px, 165px 165px, 175px 175px, 155px 155px, 185px 185px'
           }}
         ></div>
      </div>

      {/* Subtle CSS Animations */}
      <style jsx>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.01); }
        }

        @keyframes gentle-float-delayed {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }

        @keyframes gentle-float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-3px) scale(1.005); }
        }

        @keyframes gentle-shine {
          0%, 100% { filter: brightness(1) blur(3rem); }
          50% { filter: brightness(1.15) blur(3.2rem); }
        }

        @keyframes gentle-shine-delayed {
          0%, 100% { filter: brightness(1) blur(3rem); }
          50% { filter: brightness(1.2) blur(3.3rem); }
        }

        @keyframes gentle-shine-slow {
          0%, 100% { filter: brightness(1) blur(3rem); }
          50% { filter: brightness(1.1) blur(3.1rem); }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          25% { opacity: 0.8; transform: scale(1.1); }
          50% { opacity: 0.4; transform: scale(0.9); }
          75% { opacity: 0.7; transform: scale(1.05); }
        }

        @keyframes sparkle-delayed {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          30% { opacity: 0.6; transform: scale(1.15); }
          60% { opacity: 0.35; transform: scale(0.85); }
        }

        @keyframes twinkle-star {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.3); }
        }

        @keyframes twinkle-star-delayed {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.5); }
        }

        @keyframes twinkle-star-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }

        @keyframes gentle-twinkle {
          0%, 100% { opacity: 0.6; }
          33% { opacity: 0.9; }
          66% { opacity: 0.4; }
        }

        .animate-gentle-float {
          animation: gentle-float 8s ease-in-out infinite;
        }

        .animate-gentle-float-delayed {
          animation: gentle-float-delayed 10s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-gentle-float-slow {
          animation: gentle-float-slow 12s ease-in-out infinite;
          animation-delay: 4s;
        }

        .animate-gentle-shine {
          animation: gentle-shine 6s ease-in-out infinite;
        }

        .animate-gentle-shine-delayed {
          animation: gentle-shine-delayed 7s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-gentle-shine-slow {
          animation: gentle-shine-slow 8s ease-in-out infinite;
          animation-delay: 1s;
        }

        .animate-sparkle {
          animation: sparkle 4s ease-in-out infinite;
        }

        .animate-sparkle-delayed {
          animation: sparkle-delayed 5s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        .animate-twinkle-star {
          animation: twinkle-star 3s ease-in-out infinite;
        }

        .animate-twinkle-star-delayed {
          animation: twinkle-star-delayed 3.5s ease-in-out infinite;
          animation-delay: 1s;
        }

        .animate-twinkle-star-slow {
          animation: twinkle-star-slow 4s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-gentle-twinkle {
          animation: gentle-twinkle 6s ease-in-out infinite;
        }
      `}</style>

      <main className="max-w-[800px] mx-auto relative z-10 min-h-screen flex items-center">
        <div className="flex flex-col items-start justify-center w-full py-16 px-2 sm:px-4 md:px-0">
          {/* About Section */}
          <div className="mb-8 w-full">
            <div className={`w-full text-left ${
              theme === 'dark' ? 'text-[#EEEEEE]/90' : 'text-[#1A1A1E]/90'
            } transition-all duration-300`}>

              <p className="text-sm sm:text-base leading-relaxed sm:leading-loose px-1 sm:px-0">
                                 <span className="font-semibold">Burak Sahin Kucuk</span><br/>
                 <span className="text-red-500 font-semibold">Education:</span> Junior, <span className="relative group cursor-pointer font-semibold underline decoration-dotted decoration-1 underline-offset-2 hover:decoration-2 transition-all duration-300">Statistics<span className={`absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap z-20 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out shadow-2xl border backdrop-blur-3xl ${theme === 'dark' ? 'bg-white/5 text-white border-white/10' : 'bg-white/20 text-gray-800 border-white/30'}`} style={{backdropFilter: 'blur(20px)'}}>GPA: 3.95/4</span></span> & <span className="relative group cursor-pointer font-semibold underline decoration-dotted decoration-1 underline-offset-2 hover:decoration-2 transition-all duration-300">Computer Eng.<span className={`absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap z-20 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out shadow-2xl border backdrop-blur-3xl ${theme === 'dark' ? 'bg-white/5 text-white border-white/10' : 'bg-white/20 text-gray-800 border-white/30'}`} style={{backdropFilter: 'blur(20px)'}}>GPA: 3.09/4</span></span> Student @METU<br/>
                 <span className="text-red-500 font-semibold">Location:</span> Ankara, Türkiye<br/>
                 <span className="text-red-500 font-semibold">Interests:</span> Statistics, Autonomus Computing, Machine Learning, UI/UX Design, Product Management<br/>
                 <span className="text-red-500 font-semibold">Ongoings:</span> Trying to master Python and R, planning to learn C++ soon.<br/>
                 <span className="text-red-500 font-semibold">Latest Project:</span> <a href="https://metuans.tech" target="_blank" rel="noopener noreferrer" className="font-semibold">metuans.tech</a> - Course Scheduling App for METU Students with Various Background Images<br/>
                 <span className="text-red-500 font-semibold">Latest Blog:</span> {latestBlogTitle}
              </p>
            </div>
          </div>
          
          {/* Social Grid - 800px width and centered */}
          <div className="w-full flex justify-center relative">
            <div className="w-full max-w-[800px] px-1 sm:px-0">
            <SocialGrid />
            </div>
          </div>

          {/* Elegant decorative element */}

        </div>
      </main>
    </div>
  );
}
