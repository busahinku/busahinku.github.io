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
        return theme === 'dark' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-600 border-blue-200';
      case 'completed':
        return theme === 'dark' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-green-100 text-green-600 border-green-200';
      case 'planned':
        return theme === 'dark' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-purple-100 text-purple-600 border-purple-200';
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
          theme === 'dark' ? 'bg-purple-500' : 'bg-purple-300'
        } animate-float`} />
        <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-10 ${
          theme === 'dark' ? 'bg-blue-500' : 'bg-blue-300'
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
              ? 'from-white via-purple-200 to-blue-200' 
              : 'from-gray-900 via-purple-600 to-blue-600'
          } bg-clip-text text-transparent`}>
            Reading List
          </h1>
          
          <p className={`text-lg max-w-2xl mx-auto leading-relaxed ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            My personal library of knowledge - a curated collection spanning statistics, machine learning, finance, and software architecture.
          </p>
        </div>

        {/* Enhanced Books Grid */}
        <div className="grid grid-cols-1 gap-8">
          {books.map((book, index) => (
            <a
              key={book.title}
              href={book.link}
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
                book.status === 'reading' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                book.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                'bg-gradient-to-br from-purple-500 to-pink-500'
              }`} />

              <div className="flex flex-col sm:flex-row">
                {/* Enhanced Image Section */}
                <div className="relative w-full sm:w-64 h-64 sm:h-80 overflow-hidden">
                  <Image
                    src={book.image}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${
                    theme === 'dark' 
                      ? 'from-black/60 via-transparent to-transparent' 
                      : 'from-black/30 via-transparent to-transparent'
                  }`} />
                  
                                      {/* Floating Status Badge */}
                    <div className={`absolute top-4 left-4 px-3 py-2 rounded-xl text-sm font-medium backdrop-blur-md border transition-all duration-300 group-hover:scale-110 ${getStatusColor(book.status)}`}>
                      {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                    </div>

                  {/* Genre Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-black/30 border border-white/20 text-white'
                      : 'bg-white/30 border border-white/40 text-gray-800'
                  }`}>
                    {book.genre}
                  </div>
                </div>

                {/* Enhanced Content Section */}
                <div className="flex-1 p-8 relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${
                      book.status === 'reading' ? 'bg-blue-400' :
                      book.status === 'completed' ? 'bg-green-400' :
                      'bg-purple-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                    }`}>
                      by {book.author}
                    </span>
                  </div>

                  <h2 className={`text-2xl font-bold mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  } ${
                    book.status === 'reading' ? 'group-hover:from-blue-400 group-hover:to-cyan-400' :
                    book.status === 'completed' ? 'group-hover:from-green-400 group-hover:to-teal-400' :
                    'group-hover:from-purple-400 group-hover:to-pink-400'
                  }`}>
                    {book.title}
                  </h2>

                  <p className={`text-sm leading-relaxed mb-6 ${
                    theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    {book.description}
                  </p>

                  {/* Enhanced CTA */}
                  <div className={`inline-flex items-center gap-3 text-sm font-semibold transition-all duration-300 group-hover:gap-4 ${
                    book.status === 'reading' ? 'text-blue-400 group-hover:text-blue-300' :
                    book.status === 'completed' ? 'text-green-400 group-hover:text-green-300' :
                    'text-purple-400 group-hover:text-purple-300'
                  }`}>
                    <span>View on Amazon</span>
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
              </div>

              {/* Enhanced Shine Effect */}
              <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${
                book.status === 'reading' ? 'from-transparent via-blue-400/30 to-transparent' :
                book.status === 'completed' ? 'from-transparent via-green-400/30 to-transparent' :
                'from-transparent via-purple-400/30 to-transparent'
              } animate-shimmer`} />
            </a>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 text-center">
          <div className={`inline-flex items-center gap-6 text-sm ${
            theme === 'dark' ? 'text-white/40' : 'text-gray-400'
          }`}>
            <span>{books.filter(b => b.status === 'reading').length} Currently Reading</span>
            <span>•</span>
            <span>{books.filter(b => b.status === 'planned').length} Planned</span>
          </div>
        </div>
      </main>
    </div>
  );
} 