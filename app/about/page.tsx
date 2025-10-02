'use client';

import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';
import SocialGrid from '../components/SocialGrid';
import BackgroundPattern from '../components/BackgroundPattern';

export default function AboutPage() {
  const { theme } = useTheme();

  return (
    <div className="w-full max-[820px]:px-6 relative overflow-hidden">
      <BackgroundPattern variant="minimal" />

      <main className="max-w-4xl mx-auto pt-32 pb-16 relative z-10">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex items-start gap-6 mb-14">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden">
                <Image
                  src="/images/profile.jpg"
                  alt="Burak Sahin Kucuk"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  priority
                  quality={100}
                />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 ${
                theme === 'dark' ? 'bg-green-400 border-[#0D0D0F]' : 'bg-green-400 border-white'
              }`} title="Available for opportunities" />
            </div>

            <div className="flex-1">
              <h2 className={`text-sm font-medium mb-2 mt-0 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Burak Sahin Kucuk
              </h2>

              <p className={`text-lg mb-1 ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-700'
              }`}>
                Student at Middle East Technical University
              </p>

              <p className={`text-base mb-4 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>
                Ankara, Türkiye
              </p>

              {/* Download CV Button */}
              <div>
                <a
                  href="/about/CVlight.pdf"
                  download
                  className={`inline-flex items-center gap-2 px-4 py-2 border text-sm font-medium transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'text-white border-white/20 hover:border-white/40'
                      : 'text-gray-900 border-gray-300 hover:border-gray-500'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Resume
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-10">
          <h3 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            About
          </h3>
          <p className={`text-base leading-relaxed ${
            theme === 'dark' ? 'text-white/80' : 'text-gray-700'
          }`}>
        Hey! I’m Burak Sahin, a junior pursuing degrees in Statistics and Computer Science at Middle East Technical University. I like to consider myself as someone who likes to create things and present them to people.
          </p>
        </div>

        {/* Education */}
        <div className="mb-10">
          <h3 className={`text-lg font-semibold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Education
          </h3>

          <div className="space-y-6">
            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-lg font-medium mt-0 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  BSc in Statistics
                </h4>
                <span className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-700'
                }`}>
                  3.95/4.0
                </span>
              </div>
              <p className={`text-md mb-3 ${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              }`}>
                Middle East Technical University
              </p>
              <div className="flex flex-wrap gap-2">
                {['Data Processing & Vis.', 'Statistical Programming', 'Probability I - II', 'OOP'].map((course) => (
                  <span key={course} className={`px-2 py-1 border text-xs ${
                    theme === 'dark' ? 'border-white/20 text-white/70' : 'border-gray-300 text-gray-700'
                  }`}>
                    {course}
                  </span>
                ))}
              </div>
            </div>

            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-lg font-medium mt-0 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  BSc in Computer Engineering
                </h4>
                <span className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  3.22/4.0
                </span>
              </div>
              <p className={`text-md mb-3 ${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              }`}>
                Middle East Technical University
              </p>
              <div className="flex flex-wrap gap-2">
                {['Discrete Math.', 'C Programming', 'Data Structures'].map((course) => (
                  <span key={course} className={`px-2 py-1 border text-xs ${
                    theme === 'dark' ? 'border-white/20 text-white/70' : 'border-gray-300 text-gray-700'
                  }`}>
                    {course}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Experience */}
        <div className="mb-10">
          <h3 className={`text-lg font-semibold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Experience
          </h3>

          <div className={`border-l-2 pl-4 ${
            theme === 'dark' ? 'border-white/10' : 'border-gray-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Image
                  src="/icons/companies/uabtr.png"
                  alt="UAB T.C."
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                  <div>
                    <h3 className={`text-lg font-medium mt-0 mb-1 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Internship
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                    }`}>
                      Ministry of Transport and Infrastructure of Turkey
                    </p>
                  </div>
                  <div className="text-left sm:text-right mt-2 sm:mt-0">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                    }`}>
                      Ankara, Turkey
                    </p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                    }`}>
                      July 2025 - Aug 2025
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                }`}>
                  - Data Analysis and Visualization Tasks
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="mb-10">
          <h3 className={`text-lg font-semibold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Projects
          </h3>

          <div className="space-y-6">
            {/* Project 1 */}
            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Image
                    src="/icons/companies/metuansTECH.png"
                    alt="METUANS"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <div>
                      <h3 className={`text-lg font-medium mt-0 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <a
                          href="https://metuans.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-lg hover:underline inline-flex items-center gap-2 ${
                            theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                          }`}
                        >
                          metuans.com
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17L17 7M17 7H8M17 7V16" />
                          </svg>
                        </a>
                      </h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        Course Planning and Guidance Platform for METU Students.
                      </p>
                    </div>
                    <div className="text-left sm:text-right mt-2 sm:mt-0">
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        Next.js, TypeScript
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                      }`}>
                        2024
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    Comprehensive course planning tool for METU students with interactive schedule builder and course search functionality.
                  </p>
                </div>
              </div>
            </div>

            {/* Project 2 */}
            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Image
                    src={theme === 'dark' ? "/icons/companies/logoWHITE.png" : "/icons/companies/logoDARK.png"}
                    alt="Personal Portfolio"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <div>
                      <h3 className={`text-lg font-medium mt-0 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <a
                          href="https://github.com/busahinku/busahinku.github.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-lg hover:underline inline-flex items-center gap-2 ${
                            theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                          }`}
                        >
                          Personal Portfolio and Blog
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17L17 7M17 7H8M17 7V16" />
                          </svg>
                        </a>
                      </h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        Modern Web Portfolio
                      </p>
                    </div>
                    <div className="text-left sm:text-right mt-2 sm:mt-0">
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        Next.js, Tailwind CSS
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                      }`}>
                        2024
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    Beautiful responsive design with dark/light mode toggle, interactive blog system with markdown support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-10">
          <h3 className={`text-lg font-semibold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Certifications
          </h3>

          <div className="space-y-6">
            {/* Certification 1 */}
            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Image
                    src="/icons/companies/DeepLearning.svg"
                    alt="Deep Learning"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <div>
                      <h3 className={`text-lg font-medium mt-0 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <a
                          href="https://coursera.org/share/0c2e9bb182ed3a65f5a839eef2575be2"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-lg hover:underline inline-flex items-center gap-2 ${
                            theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                          }`}
                        >
                          Machine Learning Specialization
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17L17 7M17 7H8M17 7V16" />
                          </svg>
                        </a>
                      </h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        Stanford University, Deeplearning.ai
                      </p>
                    </div>
                    <div className="text-left sm:text-right mt-2 sm:mt-0">
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                      }`}>
                        Sep 2024
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Certification 2 */}
            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Image
                    src="/icons/companies/IBMLogo.svg.png"
                    alt="IBM"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <div>
                      <h3 className={`text-lg font-medium mt-0 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <a
                          href="https://coursera.org/share/56ddf198b626ae52d50259fce412c9c3"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-lg hover:underline inline-flex items-center gap-2 ${
                            theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                          }`}
                        >
                          Data Science Specialization
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17L17 7M17 7H8M17 7V16" />
                          </svg>
                        </a>
                      </h3>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                      }`}>
                        IBM (Coursera)
                      </p>
                    </div>
                    <div className="text-left sm:text-right mt-2 sm:mt-0">
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                      }`}>
                        Feb 2024
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills & Interests */}
        <div className="mb-10">
          <h3 className={`text-lg font-semibold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Skills & Interests
          </h3>

          <div className="space-y-6">
            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Current Focus
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Python', 'R', 'C/C++', 'Data Science', 'Machine Learning', 'Product Management'].map((skill) => (
                  <span key={skill} className={`px-2 py-1 border text-sm ${
                    theme === 'dark' ? 'border-green-400/30 text-green-300' : 'border-green-600/30 text-green-700'
                  }`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Learning Next
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Quantum Computing', 'Advanced Statistics', 'HFT Algorithms'].map((skill) => (
                  <span key={skill} className={`px-2 py-1 border text-sm ${
                    theme === 'dark' ? 'border-orange-400/30 text-orange-300' : 'border-orange-600/30 text-orange-700'
                  }`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className={`border-l-2 pl-4 ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Personal
              </h3>
              <div className="space-y-2 mb-4">
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                }`}>
                  • I have loved designing since childhood. Now, I do it for fun during my breaks.
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                }`}>
                  • This website is my graph of thoughts, notes, and ideas.
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                }`}>
                  • I see myself as a relaxed and friendly person, so feel free to reach out!
                </p>
              </div>

              <div>
                <h4 className={`font-medium mb-2 text-sm ${
                  theme === 'dark' ? 'text-white/90' : 'text-gray-800'
                }`}>
                  Tools I Use Daily
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['Toggl Track', 'Obsidian', 'ShareX', 'Notion Calendar'].map((tool) => (
                    <span key={tool} className={`px-2 py-1 border text-xs ${
                      theme === 'dark' ? 'border-white/20 text-white/70' : 'border-gray-300 text-gray-700'
                    }`}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Section */}
        <div>
          <h3 className={`text-lg font-semibold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Let&apos;s Connect
          </h3>

          <div className={`border-l-2 pl-4 ${
            theme === 'dark' ? 'border-white/10' : 'border-gray-200'
          }`}>
            <p className={`text-sm mb-4 ${
              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
            }`}>
              Feel free to reach out, even just to say hi! You can contact me through any of these platforms.
            </p>

            <SocialGrid />
          </div>
        </div>
      </main>
    </div>
  );
}