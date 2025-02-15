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
    description: 'A curated collection of books I\'m currently reading or plan to read.',
    link: '/misc/reading-list',
    image: '/images/misc/books.jpg',
    date: '2024',
    category: 'Reading'
  },
  {
    title: 'Favorite Tools & Software',
    description: 'A list of tools and software I use daily for development and productivity.',
    link: '/misc/tools',
    image: '/images/misc/tools.jpg',
    date: '2024',
    category: 'Tools'
  },
  {
    title: 'Learning Resources',
    description: 'Collection of resources I find helpful for learning new technologies.',
    link: '/misc/resources',
    image: '/images/misc/learning.jpg',
    date: '2024',
    category: 'Learning'
  }
];

export default function MiscClient() {
  const { theme } = useTheme();

  return (
    <div className="w-full max-[820px]:px-6">
      <main className="max-w-[800px] mx-auto pt-24 pb-16">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className={`text-lg font-semibold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>
            Miscellaneous
          </h1>
          <div className={`border-b pb-4 ${
            theme === 'dark' ? 'border-[#2B2B2B]' : 'border-[#EDEDED]'
          }`}>
            <p className={`text-base ${
              theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
            }`}>
              A collection of various content, thoughts, and experiments that don&apos;t fit elsewhere.
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6">
          {miscItems.map((item) => (
            <Link
              key={item.title}
              href={item.link}
              className={`group relative overflow-hidden rounded-xl w-full flex flex-col sm:flex-row ${
                theme === 'dark' 
                  ? 'bg-[#1A1A1E]' 
                  : 'bg-white border border-gray-100'
              } transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="relative w-full sm:w-48 h-48 sm:h-auto overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex-1 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white'
                      : 'bg-black/5 text-black'
                  }`}>
                    {item.category}
                  </span>
                  <span className={`text-xs ${
                    theme === 'dark' ? 'text-white/40' : 'text-black/40'
                  }`}>
                    {item.date}
                  </span>
                </div>

                <h2 className={`text-xl font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                  {item.title}
                </h2>

                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>
                  {item.description}
                </p>

                <div className={`mt-4 text-sm font-medium ${
                  theme === 'dark' 
                    ? 'text-blue-400' 
                    : 'text-blue-600'
                }`}>
                  Read more →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
} 