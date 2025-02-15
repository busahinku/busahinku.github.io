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
    title: 'Statistical Inference',
    author: 'George Casella & Roger L. Berger',
    description: 'A comprehensive guide to statistical inference, covering probability theory, estimation, hypothesis testing, and more.',
    image: 'https://static-ppimages.freetls.fastly.net/nielsens/9781032593036.jpg?canvas=600,600&fit=bounds&height=600&mode=max&width=600&404=default.jpg',
    status: 'reading',
    link: 'https://www.amazon.com/Statistical-Inference-George-Casella/dp/0534243126',
    genre: 'Statistics'
  },
  {
    title: 'Introduction to Probability and Mathematical Statistics',
    author: 'Bain & Engelhardt',
    description: 'A comprehensive guide to probability and mathematical statistics, covering probability theory, estimation, hypothesis testing, and more.',
    image: 'https://i.ebayimg.com/images/g/p-EAAOSw5vBm0JfC/s-l1200.jpg',
    status: 'reading',
    link: 'https://www.amazon.com/Statistical-Inference-George-Casella/dp/8131503941',
    genre: 'Statistics'
  },
  {
    title: 'Hands-on Machine Learning with Scikit-Learn, Keras, and TensorFlow',
    author: 'Aurélien Géron',
    description: 'A comprehensive guide to machine learning, covering probability theory, estimation, hypothesis testing, and more.',
    image: 'https://m.media-amazon.com/images/I/81R5BmGtv-L._AC_UF1000,1000_QL80_.jpg',
    status: 'reading',
    link: 'https://www.amazon.com/Hands-Machine-Learning-Scikit-Learn-TensorFlow/dp/1492032646',
    genre: 'Machine Learning'
  },
  {
    title: 'CFA Program Curriculum Level 1 Volume 1: Quantitative Methods',
    author: 'CFA Institute',
    description: 'A comprehensive guide to the CFA Program Curriculum Volume 1 Level 1.',
    image: 'https://m.media-amazon.com/images/I/51cgfWkOFCL.jpg',
    status: 'planned',
    link: 'https://www.amazon.com/2025-CFA-Program-Curriculum-Level/dp/1961409089',
    genre: 'Finance'
  },
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    description: 'Data is at the center of many challenges in system design today. Difficult issues need to be figured out, such as scalability, consistency...',
    image: 'https://m.media-amazon.com/images/I/91YfNb49PLL._SY385_.jpg',
    status: 'planned',
    link: 'https://www.amazon.com/Designing-Data-Intensive-Applications-Reliable-Maintainable/dp/1449373321',
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