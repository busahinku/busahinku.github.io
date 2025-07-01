'use client';

import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';

interface Tool {
  name: string;
  description: string;
  category: string;
  image: string;
  link: string;
  isFavorite: boolean;
}

const tools: Tool[] = [
  {
    name: 'Toggl Track',
    description: 'Time tracking tool for productivity and time management.',
    category: 'Productivity',
    image: 'https://play-lh.googleusercontent.com/PeblLXajnpQMBdnzHCQ9yRh6IZ1iOM7qqJkp306uOYlYq8djKFs2vTLO5YO265MPmcM',
    link: 'https://toggl.com/',
    isFavorite: true
  },
  {
    name: 'Notion Calendar',
    description: 'Calendar tool for productivity and time management.',
    category: 'Productivity',
    image: 'https://play-lh.googleusercontent.com/ZpieHVHj503tx4YoFlsHOtjQ3edA9FE_yLocxpEecO0TQq0VcKbcsZ4fvjA9LzcRdmg',
    link: 'https://notion.so/',
    isFavorite: false
  },
  {
    name: 'Figma',
    description: 'Design tool for creating user interfaces and prototypes.',
    category: 'Design',
    image: 'https://www.figma.com/community/resource/8f3b2e8c-0d3f-4409-ae0d-42449d61b841/thumbnail',
    link: 'https://www.figma.com/',
    isFavorite: true
  },
  {
    name: 'ShareX',
    description: 'Screenshot and screen recording tool.',
    category: 'Productivity',
    image: 'https://getsharex.com/img/ShareX_Wallpaper_White_Black.png',
    link: 'https://getsharex.com/',
    isFavorite: false
  },
  {
    name: 'Obsidian',
    description: 'Note-taking app with a focus on privacy and security.',
    category: 'Productivity',
    image: 'https://cdn2.steamgriddb.com/logo/35effc542dc36933a9c7ba0d56006380.png',
    link: 'https://obsidian.md/',
    isFavorite: false
  }
];

export default function ToolsClient() {
  const { theme } = useTheme();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Productivity':
        return theme === 'dark' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Design':
        return theme === 'dark' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-100 text-purple-600 border-purple-200';
      case 'Development':
        return theme === 'dark' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-600 border-green-200';
      default:
        return theme === 'dark' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };



  return (
    <div className="w-full max-[820px]:px-6 relative overflow-hidden">
      {/* Beautiful Background */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-black' 
            : 'bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50'
        }`} />
        
        {/* Floating Orbs */}
        <div className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-15 ${
          theme === 'dark' ? 'bg-blue-500' : 'bg-blue-300'
        } animate-float`} />
        <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-10 ${
          theme === 'dark' ? 'bg-purple-500' : 'bg-purple-300'
        } animate-float-delayed`} />
        <div className={`absolute top-1/2 right-1/3 w-32 h-32 rounded-full blur-2xl opacity-20 ${
          theme === 'dark' ? 'bg-cyan-500' : 'bg-cyan-300'
        } animate-pulse`} />
      </div>

      <main className="max-w-[800px] mx-auto pt-24 pb-16 relative z-10">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/misc"
            className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 hover:scale-105 ${
              theme === 'dark' 
                ? 'text-white/70 hover:text-white bg-white/5 border-white/10 hover:bg-white/10' 
                : 'text-gray-600 hover:text-gray-900 bg-white/50 border-white/20 hover:bg-white/70'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Misc
          </Link>
        </div>

        {/* Enhanced Header Section */}
        <div className="text-center mb-16">
          <h1 className={`text-3xl font-bold bg-gradient-to-r mb-4 ${
            theme === 'dark' 
              ? 'from-white via-blue-200 to-purple-200' 
              : 'from-gray-900 via-blue-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Tools & Software
          </h1>
          
          <p className={`text-lg max-w-2xl mx-auto leading-relaxed ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            The essential toolkit that powers my daily workflow - from productivity apps to design tools and development utilities.
          </p>
        </div>

        {/* Enhanced Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tools.map((tool, index) => (
            <a
              key={tool.name}
              href={tool.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-2xl backdrop-blur-md border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' 
                  : 'bg-white/70 border-white/20 hover:bg-white/90 hover:border-white/30'
              } shadow-xl hover:shadow-2xl`}
              style={{
                animationDelay: `${index * 150}ms`
              }}
            >
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 ${
                tool.category === 'Productivity' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                tool.category === 'Design' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                'bg-gradient-to-br from-green-500 to-teal-500'
              }`} />

              {/* Enhanced Image Section */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={tool.image}
                  alt={tool.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${
                  theme === 'dark' 
                    ? 'from-black/60 via-transparent to-transparent' 
                    : 'from-black/30 via-transparent to-transparent'
                }`} />
                
                                 {/* Category Badge */}
                 <div className={`absolute top-4 left-4 px-3 py-2 rounded-xl text-sm font-medium backdrop-blur-md border transition-all duration-300 group-hover:scale-110 ${getCategoryColor(tool.category)}`}>
                   {tool.category}
                 </div>

                                 {/* Favorite Badge */}
                 {tool.isFavorite && (
                   <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md transition-all duration-300 ${
                     theme === 'dark'
                       ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                       : 'bg-yellow-100 border border-yellow-200 text-yellow-600'
                   }`}>
                     Favorite
                   </div>
                 )}
              </div>

              {/* Enhanced Content Section */}
              <div className="p-6 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${
                    tool.category === 'Productivity' ? 'bg-blue-400' :
                    tool.category === 'Design' ? 'bg-purple-400' :
                    'bg-green-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                  }`}>
                    Essential Tool
                  </span>
                </div>

                <h2 className={`text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                } ${
                  tool.category === 'Productivity' ? 'group-hover:from-blue-400 group-hover:to-cyan-400' :
                  tool.category === 'Design' ? 'group-hover:from-purple-400 group-hover:to-pink-400' :
                  'group-hover:from-green-400 group-hover:to-teal-400'
                }`}>
                  {tool.name}
                </h2>

                <p className={`text-sm leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>
                  {tool.description}
                </p>

                {/* Enhanced CTA */}
                <div className={`inline-flex items-center gap-2 text-sm font-semibold transition-all duration-300 group-hover:gap-3 ${
                  tool.category === 'Productivity' ? 'text-blue-400 group-hover:text-blue-300' :
                  tool.category === 'Design' ? 'text-purple-400 group-hover:text-purple-300' :
                  'text-green-400 group-hover:text-green-300'
                }`}>
                  <span>Explore Tool</span>
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

              {/* Enhanced Shine Effect */}
              <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${
                tool.category === 'Productivity' ? 'from-transparent via-blue-400/30 to-transparent' :
                tool.category === 'Design' ? 'from-transparent via-purple-400/30 to-transparent' :
                'from-transparent via-green-400/30 to-transparent'
              } animate-shimmer`} />
            </a>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 text-center">
          <div className={`inline-flex items-center gap-6 text-sm ${
            theme === 'dark' ? 'text-white/40' : 'text-gray-400'
          }`}>
            <span>{tools.filter(t => t.isFavorite).length} Favorites</span>
            <span>•</span>
            <span>{tools.length} Tools Total</span>
          </div>
        </div>
      </main>
    </div>
  );
} 