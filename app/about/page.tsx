'use client';

import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';
import SocialGrid from '../components/SocialGrid';


export default function AboutPage() {
  const { theme } = useTheme();

  return (
    <div className="w-full max-[820px]:px-6">
      <main className="max-w-[800px] mx-auto pt-32 pb-16">
        {/* Download Button */}
        <div className="mb-6 flex justify-center md:justify-start">
          <a
            href="/resume.pdf"
            download
            className={`
              group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[14px]
              ${theme === 'dark' 
                ? 'bg-[#1A1A1E] hover:bg-[#232327] text-gray-300' 
                : 'bg-white hover:bg-gray-50 text-gray-600 shadow-sm'
              }
              transition-all
            `}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} group-hover:text-[#FB2549] transition-colors`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF Resume
          </a>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-0">
            <div className="w-[160px] h-[160px] md:w-[140px] md:h-[140px] rounded-xl overflow-hidden flex-shrink-0 md:self-center">
              <Image
                src="/images/profile.jpg"
                alt="Burak Sahin Kucuk"
                width={560}
                height={560}
                className="object-cover w-full h-full"
                priority
                quality={100}
                unoptimized
              />
            </div>
            <div className="text-center md:text-left flex-1 flex flex-col justify-center">
              <p className={`text-[14px] font-normal mb-3 ${
                theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
              }`}>
                Hey! This is Burak Sahin.
              </p>
              <p className={`text-[14px] font-normal ${
                theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
              }`}>
                I am currently pursing a career in Statistics and Computer Science at Middle East Technical University. Currently sophomore student with high cGPA but #gradesdontmatter. But I like to consider myself as someone who likes to create things and present them to people. I am also trying to improve myself in different fields such as Data Science, Quantum Computing, Bayesian Statistics...
              </p>
            </div>
          </div>

          <ul className={`list-disc pl-8 mt-4 space-y-2 text-[14px] ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            <li className="pl-2">I have loved designing since childhood. Now, I do it for fun during my break.</li>
            <li className="pl-2">This is my graph of thoughts, notes, and ideas.</li>
          </ul>
          <p className={`text-[14px] font-normal mt-4 mb-4 ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            I see myself as a relaxed and friendly person, so feel free to reach out, even just to say hi! You can contact me on my e-mail or my social media accounts.
          </p>
          
          <SocialGrid />
        </div>
      </main>
    </div>
  );
} 