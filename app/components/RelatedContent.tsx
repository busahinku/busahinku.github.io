'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { BlogPost } from '@/app/utils/getBlogPosts';
import type { Project } from '@/app/utils/getProjects';

interface RelatedContentProps {
  items: (BlogPost | Project)[];
  type: 'blog' | 'projects';
  theme: 'light' | 'dark';
}

export default function RelatedContent({ items, type, theme }: RelatedContentProps) {
  if (items.length === 0) {
    return null;
  }

  const basePath = type === 'blog' ? '/blog' : '/projects';
  const title = type === 'blog' ? 'Related Posts' : 'Related Projects';

  return (
    <div className={`mt-16 pt-8 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
      <h2 className={`text-2xl font-bold font-serif mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`${basePath}/${item.slug}`}
            className={`group rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg ${
              theme === 'dark'
                ? 'bg-[#1A1A1E] border-white/10 hover:border-white/20'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Image */}
            <div className="relative w-full h-48 overflow-hidden">
              <Image
                src={item.mainPhoto}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className={`text-lg font-bold font-serif mb-2 line-clamp-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {item.title}
              </h3>

              <p className={`text-sm mb-3 line-clamp-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {item.description}
              </p>

              {/* Meta Info */}
              <div className="flex items-center justify-between">
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {item.date} • {item.readingTime.text}
                </div>

                {/* Tags */}
                <div className="flex gap-1 flex-wrap">
                  {item.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        theme === 'dark'
                          ? 'bg-white/10 text-white/60'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
