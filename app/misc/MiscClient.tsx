'use client';

import { useTheme } from '../context/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';

interface MiscItem {
  title: string;
  description: string;
  link: string;
  image: string;
  date: string;
  category: string;
}

const miscItems: MiscItem[] = [
  {
    title: 'My Reading List',
    description: 'A curated collection of books I\'m currently reading or plan to read, spanning across various genres and topics.',
    link: '/misc/reading-list',
    image: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_632/181397219345373.67b09cfcf01af.png',
    date: '2025',
    category: 'Reading'
  },
  {
    title: 'Favorite Tools & Software',
    description: 'A comprehensive list of tools and software I use daily for development, productivity, and creative work.',
    link: '/misc/tools',
    image: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_632/2a1d13219345373.67b09cfcf064d.png',
    date: '2025',
    category: 'Tools'
  },
  {
    title: 'Learning Resources',
    description: 'Carefully selected resources and materials that have helped me learn new technologies and advance my skills.',
    link: '/misc/resources',
    image: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_632/e792a6219345373.67b09cfcefb2e.png',
    date: '2025',
    category: 'Learning'
  },
  {
    title: 'Music of The Year',
    description: 'My personal soundtrack for 2025 - a carefully curated playlist of songs that define my year.',
    link: 'https://open.spotify.com/playlist/768iqNmf4DJINbq8nIhe2e?si=917c3267d3454003',
    image: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_632/dffb29219345373.67b09cfcef621.png',
    date: '2025',
    category: 'Music'
  }
];

export default function MiscClient() {
  const { theme } = useTheme();

  return (
    <div className="w-full max-[820px]:px-6 relative overflow-hidden">
      {/* Beautiful Background */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-[#0D0D0F]' 
            : 'bg-white'
        }`} />
        
        {/* Floating Orbs - Only for dark mode */}
        {theme === 'dark' && (
          <>
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 bg-purple-500 animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 bg-blue-500 animate-float-delayed" />
            <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full blur-2xl opacity-25 bg-cyan-500 animate-pulse" />
          </>
        )}
      </div>

      <main className="max-w-[800px] mx-auto pt-24 pb-16 relative z-10">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {miscItems.map((item, index) => (
            <Link
              key={item.title}
              href={item.link}
              className={`group relative overflow-hidden rounded-2xl backdrop-blur-md border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' 
                  : 'bg-white/70 border-white/20 hover:bg-white/90 hover:border-white/30'
              } shadow-xl hover:shadow-2xl`}
              style={{
                animationDelay: `${index * 150}ms`
              }}
            >


              {/* Image Section */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${
                  theme === 'dark' 
                    ? 'from-black/60 via-transparent to-transparent' 
                    : 'from-black/20 via-transparent to-transparent'
                }`} />
                


                {/* Category Badge */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-black/30 border border-white/20 text-white'
                    : 'bg-white/30 border border-white/40 text-gray-800'
                }`}>
                  {item.category}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${
                    index % 4 === 0 ? 'bg-purple-400' :
                    index % 4 === 1 ? 'bg-blue-400' :
                    index % 4 === 2 ? 'bg-green-400' :
                    'bg-orange-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                  }`}>
                    {item.date}
                  </span>
                </div>

                <h2 className={`text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                } ${
                  index % 4 === 0 ? 'group-hover:from-purple-400 group-hover:to-pink-400' :
                  index % 4 === 1 ? 'group-hover:from-blue-400 group-hover:to-cyan-400' :
                  index % 4 === 2 ? 'group-hover:from-green-400 group-hover:to-teal-400' :
                  'group-hover:from-orange-400 group-hover:to-red-400'
                }`}>
                  {item.title}
                </h2>

                <p className={`text-sm leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>
                  {item.description}
                </p>

                {/* Enhanced CTA */}
                <div className={`inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3 ${
                  index % 4 === 0 ? 'text-purple-400 group-hover:text-purple-300' :
                  index % 4 === 1 ? 'text-blue-400 group-hover:text-blue-300' :
                  index % 4 === 2 ? 'text-green-400 group-hover:text-green-300' :
                  'text-orange-400 group-hover:text-orange-300'
                }`}>
                  <span>Explore</span>
                  <svg 
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>

              {/* Subtle Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
            </Link>
          ))}
        </div>

        {/* Bottom Decoration */}
        <div className="text-center mt-16">
          <div className={`inline-flex items-center gap-2 text-sm ${
            theme === 'dark' ? 'text-white/40' : 'text-gray-400'
          }`}>
            <span>More content coming soon</span>
          </div>
        </div>
      </main>


    </div>
  );
} 