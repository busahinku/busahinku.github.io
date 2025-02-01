'use client';

import Image from 'next/image';
import { useTheme } from './context/ThemeContext';
import SocialGrid from './components/SocialGrid';

export default function Home() {
  const { theme } = useTheme();

  const ongoings = [
    {
      title: 'Currently reading: ',
      items: [
        { text: 'Casella', link: 'https://pages.stat.wisc.edu/~shao/stat610/Casella_Berger_Statistical_Inference.pdf' },
        { text: 'Bain', link: 'https://archive.org/details/introductiontopr0000bain' },
        { text: 'CFA 1 vol1', link: 'https://www.ithalkitaplar.com/2024-cfa-program-curriculum-level-i-box-set-volume-1-6-by-cfa-institute-5455' },
        { text: 'Hands-on ML', link: 'https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/' }
      ],
      icon: '/icons/book.svg'
    },
    {
      title: 'Trying to master Python and R, planning to learn C++ soon.',
      icon: '/icons/coding.svg'
    },
    {
      title: 'Bla bla bla bla',
      icon: '/icons/shape.svg'
    },
    {
      title: 'Actively learning statistical modeling',
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
            Hey! This is Burak Sahin.
          </p>
          <p className={`text-base font-normal ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            I am currently pursing a career in Statistics and Computer Science at Middle East Technical University. Currently sophomore student with high cGPA but #gradesdontmatter. But I like to consider myself as someone who likes to create things and present them to people. I am also trying to improve myself in different fields such as Data Science, Quantum Computing, Bayesian Statistics...
          </p>
          <ul className={`list-disc pl-8 mt-4 space-y-2 ${
            theme === 'dark' ? 'text-[#EEEEEE]' : 'text-[#1A1A1E]'
          }`}>
            <li className="pl-2">I have loved designing since childhood. Now, I do it for fun during my break.</li>
            <li className="pl-2">This is my graph of thoughts, notes, and ideas.</li>
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
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 relative mt-1">
                    <Image
                      src={item.icon}
                      alt={item.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <span className={`text-base ${
                      theme === 'dark' ? 'text-[#634E4E]' : 'text-[#CD9D9D]'
                    }`}>
                      {item.title}
                    </span>
                    {item.items && (
                      <span className="inline">
                        {item.items.map((subItem, subIndex) => (
                          <span key={subIndex} className="inline">
                            <a
                              href={subItem.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-item text-base"
                            >
                              {subItem.text}
                            </a>
                            {subIndex < item.items.length - 1 && <span className="text-[#634E4E] dark:text-[#CD9D9D]">, </span>}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
