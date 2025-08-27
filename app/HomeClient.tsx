'use client';

import { useTheme } from './context/ThemeContext';
import SocialGrid from './components/SocialGrid';
import BackgroundPattern from './components/BackgroundPattern';

interface HomeClientProps {
  latestBlogTitle: string;
}

export default function HomeClient({ latestBlogTitle }: HomeClientProps) {
  const { theme } = useTheme();

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 max-[820px]:px-6 page-transition relative overflow-hidden min-h-screen">
      <BackgroundPattern variant="minimal" />

      <main className="max-w-[800px] mx-auto relative z-10 min-h-screen flex items-center">
        <div className="flex flex-col items-start justify-center w-full py-16 px-2 sm:px-4 md:px-0 mt-20 sm:mt-24">
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
                 <span className="text-red-500 font-semibold">Ongoings:</span> Trying to master Python and R and C/C++<br/>
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