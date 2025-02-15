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
    name: 'Visual Studio Code',
    description: 'My primary code editor with extensive customization and extensions.',
    category: 'Development',
    image: '/images/misc/tools/vscode.png',
    link: 'https://code.visualstudio.com/',
    isFavorite: true
  },
  {
    name: 'GitHub Copilot',
    description: 'AI-powered coding assistant that helps with code completion and suggestions.',
    category: 'Development',
    image: '/images/misc/tools/github-copilot.png',
    link: 'https://github.com/features/copilot',
    isFavorite: true
  },
  {
    name: 'Figma',
    description: 'Design tool for creating user interfaces and prototypes.',
    category: 'Design',
    image: '/images/misc/tools/figma.png',
    link: 'https://www.figma.com/',
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