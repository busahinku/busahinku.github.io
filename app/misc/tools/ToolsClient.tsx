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

  return (
    <div className="w-full max-[820px]:px-6">
      <main className="max-w-[800px] mx-auto pt-24 pb-16">
        {/* Header Section */}
        <div className="mb-8">
          <Link
            href="/misc"
            className={`text-sm mb-4 inline-flex items-center ${
              theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
            }`}
          >
            ← Back to Misc
          </Link>
          <h1 className={`text-lg font-semibold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>
            Tools & Software
          </h1>
          <div className={`border-b pb-4 ${
            theme === 'dark' ? 'border-[#2B2B2B]' : 'border-[#EDEDED]'
          }`}>
            <p className={`text-base ${
              theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
            }`}>
              A list of tools and software I use daily for development and productivity.
            </p>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 gap-6">
          {tools.map((tool) => (
            <a
              key={tool.name}
              href={tool.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-xl w-full flex flex-col sm:flex-row ${
                theme === 'dark' 
                  ? 'bg-[#1A1A1E]' 
                  : 'bg-white border border-gray-100'
              } transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="relative w-full sm:w-48 h-48 sm:h-auto overflow-hidden">
                <Image
                  src={tool.image}
                  alt={tool.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex-1 p-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white'
                      : 'bg-black/5 text-black'
                  }`}>
                    {tool.category}
                  </span>
                  {tool.isFavorite && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      theme === 'dark'
                        ? 'bg-yellow-400/20 text-yellow-400'
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      Favorite
                    </span>
                  )}
                </div>

                <h2 className={`text-xl font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                  {tool.name}
                </h2>

                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>
                  {tool.description}
                </p>

                <div className={`mt-4 text-sm font-medium ${
                  theme === 'dark' 
                    ? 'text-blue-400' 
                    : 'text-blue-600'
                }`}>
                  Learn more →
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
} 