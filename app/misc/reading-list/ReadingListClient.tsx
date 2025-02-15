'use client';

import { useTheme } from '../../context/ThemeContext';
import Image from 'next/image';
import Link from 'next/link';

interface Book {
  title: string;
  author: string;
  description: string;
  image: string;
  status: 'reading' | 'completed' | 'planned';
  link: string;
  genre: string;
}

const books: Book[] = [
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description: 'A handbook of agile software craftsmanship that helps developers write better code.',
    image: '/images/misc/books/clean-code.jpg',
    status: 'completed',
    link: 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882',
    genre: 'Software Development'
  },
  {
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt & David Thomas',
    description: 'A guide to becoming a better programmer through practical examples and advice.',
    image: '/images/misc/books/pragmatic-programmer.jpg',
    status: 'reading',
    link: 'https://www.amazon.com/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052',
    genre: 'Software Development'
  },
  {
    title: 'Design Patterns',
    author: 'Erich Gamma et al.',
    description: 'A catalog of reusable design patterns for object-oriented software design.',
    image: '/images/misc/books/design-patterns.jpg',
    status: 'planned',
    link: 'https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612',
    genre: 'Software Architecture'
  }
];

export default function ReadingListClient() {
  const { theme } = useTheme();

  const getStatusColor = (status: Book['status']) => {
    switch (status) {
      case 'reading':
        return theme === 'dark' ? 'bg-blue-400/20 text-blue-400' : 'bg-blue-100 text-blue-600';
      case 'completed':
        return theme === 'dark' ? 'bg-green-400/20 text-green-400' : 'bg-green-100 text-green-600';
      case 'planned':
        return theme === 'dark' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600';
    }
  };

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
            Reading List
          </h1>
          <div className={`border-b pb-4 ${
            theme === 'dark' ? 'border-[#2B2B2B]' : 'border-[#EDEDED]'
          }`}>
            <p className={`text-base ${
              theme === 'dark' ? 'text-[#EEEEEE]/60' : 'text-[#1A1A1E]/60'
            }`}>
              A curated collection of books I&apos;m currently reading or plan to read.
            </p>
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 gap-6">
          {books.map((book) => (
            <a
              key={book.title}
              href={book.link}
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
                  src={book.image}
                  alt={book.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex-1 p-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(book.status)}`}>
                    {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white'
                      : 'bg-black/5 text-black'
                  }`}>
                    {book.genre}
                  </span>
                </div>

                <h2 className={`text-xl font-semibold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                  {book.title}
                </h2>

                <p className={`text-sm mb-2 ${
                  theme === 'dark' ? 'text-white/40' : 'text-black/40'
                }`}>
                  by {book.author}
                </p>

                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>
                  {book.description}
                </p>

                <div className={`mt-4 text-sm font-medium ${
                  theme === 'dark' 
                    ? 'text-blue-400' 
                    : 'text-blue-600'
                }`}>
                  View on Amazon →
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
} 