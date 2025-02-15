'use client';

import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import Image from 'next/image';

interface Resource {
  title: string;
  description: string;
  category: string;
  platform: string;
  link: string;
  image: string;
  isRecommended: boolean;
}

const resources: Resource[] = [
  {
    title: 'Other Online Sources Will Be Added Soon',
    description: 'I will add more resources as I find them.',
    category: 'Data Science',
    platform: 'Coursera',
    link: 'https://www.coursera.org/',
    image: 'https://s3-symbol-logo.tradingview.com/international-bus-mach--600.png',
    isRecommended: true
  }
];

export default function ResourcesClient() {
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
            Learning Resources
          </h1>
          <div className={`border-b pb-4 ${
            theme === 'dark' ? 'border-[#2B2B2B]' : 'border-[#EDEDED]'
          }`}>
            <p className={`text-base ${
              theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
            }`}>
              Collection of resources I find helpful for learning new technologies.
            </p>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 gap-6">
          {resources.map((resource) => (
            <a
              key={resource.title}
              href={resource.link}
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
                  src={resource.image}
                  alt={resource.title}
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
                    {resource.category}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    theme === 'dark'
                      ? 'bg-purple-400/20 text-purple-400'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {resource.platform}
                  </span>
                  {resource.isRecommended && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      theme === 'dark'
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      Recommended
                    </span>
                  )}
                </div>

                <h2 className={`text-xl font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                  {resource.title}
                </h2>

                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>
                  {resource.description}
                </p>

                <div className={`mt-4 text-sm font-medium ${
                  theme === 'dark' 
                    ? 'text-blue-400' 
                    : 'text-blue-600'
                }`}>
                  Visit resource →
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
} 