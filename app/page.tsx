'use client';

import Image from 'next/image';
import { useTheme } from './context/ThemeContext';
import SocialGrid from './components/SocialGrid';

export default function Home() {
  const { theme } = useTheme();

  const ongoings = [
    {
      title: 'Learning Quantum Computing',
      icon: '/icons/book.svg'
    },
    {
      title: 'Mastering the language Python',
      icon: '/icons/coding.svg'
    },
    {
      title: 'Bla bla bla bla',
      icon: '/icons/shape.svg'
    },
    {
      title: 'Laaaa',
      icon: '/icons/statics.svg'
    }
  ];

  return (
    <div className="w-full max-[820px]:px-6">
      <main className="max-w-[800px] mx-auto pt-12 pb-16">
        <div className="flex flex-col">
          <div className="w-[60px] h-[60px] rounded-xl overflow-hidden mb-6">
            <Image
              src="/images/profile.jpg"
              alt="Burak Sahin Kucuk"
              width={240}
              height={240}
              className="object-cover w-full h-full"
              priority
              quality={100}
              unoptimized
            />
          </div>
          <p className={`text-base font-normal mb-2 ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            Hi! I am Burak Sahin Kucuk.
          </p>
          <p className={`text-base font-normal ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            I am currently pursing a career in Statistics and Computer Science at Middle East Technical University. I am currently sophomore student with high cGPAs. But I like to consider myself as someone who likes to create things and present them to people. I am also trying to improve myself in different fields such as Data Science, Machine Learning, Bayesian Statistics...
          </p>
          <ul className={`list-disc pl-8 mt-4 space-y-2 ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            <li className="pl-2">I have loved designing since childhood. Nowadays, I have taken a break from it and make it for fun.</li>
            <li className="pl-2">Dot Amet laoreet sagittis in lectus quis dui risus laoreet.</li>
          </ul>
          <p className={`text-base font-normal mt-4 mb-4 ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            I see myself as a relaxed and friendly person, so feel free to reach out, even just to say hi! You can contact me on my e-mail or my social media accounts.
          </p>
          
          <SocialGrid />

          {/* Current Ongoings Section */}
          <div className="mt-8">
            <h2 className={`text-[20px] font-semibold mb-4 ${
              theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
            }`}>
              Current Ongoings
            </h2>
            <div className="space-y-3">
              {ongoings.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 relative">
                    <Image
                      src={item.icon}
                      alt={item.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`text-base ${
                    theme === 'dark' ? 'text-[#634E4E]' : 'text-[#CD9D9D]'
                  }`}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
