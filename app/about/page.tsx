'use client';

import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';
import SocialGrid from '../components/SocialGrid';

export default function AboutPage() {
  const { theme } = useTheme();

  return (
    <div className="w-full max-[820px]:px-6 relative overflow-hidden">
      {/* Beautiful Background with Gradients */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-[#0D0D0F]' 
            : 'bg-white'
        }`} />
        
        {/* Floating Orbs - Optimized for performance */}
        {theme === 'dark' && (
          <>
            <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-xl opacity-10 bg-purple-500" />
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full blur-xl opacity-10 bg-blue-500" />
          </>
        )}
      </div>

      <main className="max-w-[800px] mx-auto pt-24 pb-16 relative z-10">


        {/* Profile Section */}
        <div className={`relative overflow-hidden rounded-2xl border p-8 mb-8 transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white/70 border-white/20'
        } shadow-xl`}>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-purple-500 to-cyan-500" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-40 h-40 rounded-2xl overflow-hidden flex-shrink-0 ring-4 ring-white/10">
                  <Image
                    src="/images/profile.jpg"
                    alt="Burak Sahin Kucuk"
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                    priority
                    quality={100}
                  />
                </div>
                {/* Status Indicator */}
                <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 ${
                  theme === 'dark' ? 'bg-green-400 border-[#0D0D0F]' : 'bg-green-400 border-white'
                }`} title="Available for opportunities" />
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className={`text-2xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Burak Sahin Kucuk
                </h2>
                
                <div className="space-y-2 mb-4">
                  <p className={`text-lg font-medium ${
                    theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                  }`}>
                    Student
                  </p>
                  <p className={`${
                    theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    Middle East Technical University • Ankara, Türkiye
                  </p>
                </div>

                                 {/* Download CV Buttons */}
                 <div className="flex flex-col sm:flex-row gap-3">
                   <a
                     href="/about/CV_censored_sophomore_Burak.pdf"
                     download
                     className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                       theme === 'dark' 
                         ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' 
                         : 'bg-gray-900 hover:bg-gray-800 text-white'
                     } shadow-lg hover:shadow-xl`}
                   >
                     <svg
                       width="16"
                       height="16"
                       viewBox="0 0 24 24"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth="2"
                       strokeLinecap="round"
                       strokeLinejoin="round"
                     >
                       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                       <polyline points="7 10 12 15 17 10" />
                       <line x1="12" y1="15" x2="12" y2="3" />
                     </svg>
                     Download Resume
                   </a>
                   
          <a
            href="/about/CV_censored_sophomore_Burak.pdf"
            download
                     className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                       theme === 'dark' 
                         ? 'bg-gray-800/50 hover:bg-gray-700/60 text-white border border-gray-600/30' 
                         : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                     } shadow-lg hover:shadow-xl`}
          >
            <svg
                       width="16"
                       height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
                     Download Dark Resume
          </a>
        </div>
              </div>
            </div>
          </div>
          
          {/* Shimmer Effect */}
                      {/* Shimmer effect removed for performance */}
        </div>



        {/* First Content Grid - About & Education */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* About Section */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 transition-[colors,transform] duration-500 hover:scale-[1.02] ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/10 hover:bg-white/8' 
              : 'bg-white/70 border-white/20 hover:bg-white/85'
          } shadow-xl hover:shadow-lg`}>
            
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-500 to-cyan-500" />
            
            <div className="relative z-10">
              <h3 className={`text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                About
              </h3>
              
              <p className={`leading-relaxed mb-4 ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-700'
              }`}>
                Hey! This is Burak Sahin. I am currently pursuing a career in Statistics and Computer Science. I am a junior at Middle East Technical University.
              </p>
              
              <p className={`leading-relaxed ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-700'
              }`}>
                I like to consider myself as someone who likes to create things and present them to people. I am passionate about Design, Data Science, Some Type of Computing, and Bayesian Statistics.
              </p>
            </div>
            
            {/* Shimmer effect removed for performance */}
          </div>

          {/* Education Section */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 transition-[colors,transform] duration-500 hover:scale-[1.02] ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/10 hover:bg-white/8' 
              : 'bg-white/70 border-white/20 hover:bg-white/85'
          } shadow-xl hover:shadow-lg`}>
            
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-purple-500 to-pink-500" />
            
            <div className="relative z-10">
              <h3 className={`text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Education
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className={`font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      BSc in Statistics
                    </h5>
                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                      theme === 'dark' ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                    }`}>
                      GPA: 3.95/4
                    </div>
                  </div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    Middle East Technical University
                  </p>
                  
                  {/* Selected Courseworks */}
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {['Data Processing and Visualization', 'Stat & Data Science', 'Object Oriented Prog.', 'Statistical Programming'].map((course) => (
                        <span key={course} className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className={`font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      BSc in Computer Eng.
                    </h5>
                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                      theme === 'dark' ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      GPA: 3.09/4
                    </div>
                  </div>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    Middle East Technical University
                  </p>
                  
                  {/* Selected Courseworks */}
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {['Discrete Computational Structures', 'C Programming'].map((course) => (
                        <span key={course} className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Shimmer effect removed for performance */}
          </div>
        </div>

        {/* Experience Section - Full Width */}
        <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-8 mb-8 transition-[colors,transform] duration-500 hover:scale-[1.02] ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10 hover:bg-white/8' 
            : 'bg-white/70 border-white/20 hover:bg-white/85'
        } shadow-xl hover:shadow-lg`}>
            
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-indigo-500 to-purple-500" />
            
            <div className="relative z-10">
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-8 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Experience
              </h3>
              
              <div className="space-y-10 sm:space-y-8">
                
                {/* Experience 1 */}
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                  {/* Logo */}
                  <div 
                    className={`rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <div className={`text-xs font-bold ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-400'
                    }`}>
                      <Image
                        src="/icons/companies/uabtr.png"
                        alt="UAB T.C."
                        width={36}
                        height={36}
                      />
                    </div>
                  </div>
                  
                  {/* Company & Position */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base sm:text-lg font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Internship
                        </h4>
                        <p className={`text-sm sm:text-base ${
                          theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                        }`}>
                          Ministry of Transport and Infrastructure of Turkey (UAB T.C.)
                        </p>
                      </div>
                      
                      {/* Country & Date */}
                      <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0 sm:pr-8 sm:text-right">
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
                    
                    {/* Bullet Points */}
                    <ul className={`text-sm space-y-2 ${
                      theme === 'dark' ? 'text-white/75' : 'text-gray-600'
                    }`}>
                      <li>• Data Analysis and Visualization Tasks</li>

                    </ul>
                  </div>
                </div>
                {/* Experience 1 Finished */}
                




              </div>
            </div>
            
            {/* Shimmer effect removed for performance */}
        </div>

        {/* Projects Section - Full Width */}
        <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-8 mb-8 transition-[colors,transform] duration-500 hover:scale-[1.02] ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10 hover:bg-white/8' 
            : 'bg-white/70 border-white/20 hover:bg-white/85'
        } shadow-xl hover:shadow-lg`}>
            
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-green-500 to-cyan-500" />
            
            <div className="relative z-10">
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-8 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Projects
              </h3>
              
              <div className="space-y-10 sm:space-y-8">
                
                {/* Project 1 */}
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                  {/* Logo */}
                  <div 
                    className={`rounded-xl flex items-center justify-center flex-shrink-0`}
                    style={{ width: '36px', height: '36px' }}
                  >
                    <div className={`text-lg ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-400'
                    }`}>
                      <Image
                        src="/icons/companies/metuansTECH.png"
                        alt="METUANS"
                        width={36}
                        height={36}
                      />
                    </div>
                  </div>
                  
                  {/* Project Name & Description */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base sm:text-lg font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          <a 
                            href="https://metuans.tech" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`hover:underline transition-colors duration-300 inline-flex items-center gap-2 group ${
                              theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                            }`}
                          >
                            metuans.tech
                            <svg className={`w-3 sm:w-4 h-3 sm:h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 ${
                              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                            }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 17L17 7M17 7H8M17 7V16" />
                            </svg>
                          </a>
                        </h4>
                        <p className={`text-sm sm:text-base ${
                          theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                        }`}>
                          Course Planning Platform
                        </p>
                      </div>
                      
                      {/* Tech Stack & Date */}
                      <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0 sm:text-right">
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
                    
                    {/* Bullet Points */}
                    <ul className={`text-sm space-y-2 ${
                      theme === 'dark' ? 'text-white/75' : 'text-gray-600'
                    }`}>
                      <li>• Comprehensive course planning tool for METU students</li>
                      <li>• Interactive schedule builder with conflict detection</li>
                      <li>• Course search and filtering by prerequisites and departments</li>
                    </ul>
                  </div>
                </div>

                
                {/* Project 3 */}
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                  {/* Logo */}
                  <div 
                    className={`rounded-xl flex items-center justify-center flex-shrink-0`}
                    style={{ width: '36px', height: '36px' }}
                  >
                    <div className={`text-lg ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-400'
                    }`}>
                      <Image
                        src={theme === 'dark' ? "/icons/companies/logoWHITE.png" : "/icons/companies/logoDARK.png"}
                        alt="Personal Portfolio and Blog"
                        width={40}
                        height={36}
                      />
                    </div>
                  </div>
                  
                  {/* Project Name & Description */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base sm:text-lg font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          <a 
                            href="https://github.com/busahinku/busahinku.github.io" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`hover:underline transition-colors duration-300 inline-flex items-center gap-2 group ${
                              theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                            }`}
                          >
                            Personal Portfolio and Blog
                            <svg className={`w-3 sm:w-4 h-3 sm:h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 ${
                              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                            }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 17L17 7M17 7H8M17 7V16" />
                            </svg>
                          </a>
                        </h4>
                        <p className={`text-sm sm:text-base ${
                          theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                        }`}>
                          Modern Web Portfolio
                        </p>
                      </div>
                      
                      {/* Tech Stack & Date */}
                      <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0 sm:text-right">
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
                    
                    {/* Bullet Points */}
                    <ul className={`text-sm space-y-2 ${
                      theme === 'dark' ? 'text-white/75' : 'text-gray-600'
                    }`}>
                      <li>• Beautiful responsive design with dark/light mode toggle</li>
                      <li>• Interactive blog system with markdown support</li>
                      <li>• Optimized performance and SEO-friendly architecture</li>
          </ul>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Shimmer effect removed for performance */}
        </div>

        {/* Second Content Grid - Personal & Interests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Personal Section */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 transition-[colors,transform] duration-500 hover:scale-[1.02] ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/10 hover:bg-white/8' 
              : 'bg-white/70 border-white/20 hover:bg-white/85'
          } shadow-xl hover:shadow-lg`}>
            
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-orange-500 to-red-500" />
            
            <div className="relative z-10">
              <h3 className={`text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Personal
              </h3>
              
              <div className="space-y-3">
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
              
              <div className="mt-4">
                <h4 className={`font-medium mb-2 ${
                  theme === 'dark' ? 'text-white/90' : 'text-gray-800'
                }`}>
                  Tools I Use Daily
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['Toggl Track', 'Obsidian', 'ShareX', 'Notion Calendar'].map((tool) => (
                    <span key={tool} className={`px-2 py-1 rounded-md text-xs font-medium ${
                      theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Shimmer effect removed for performance */}
          </div>

          {/* Interests Section */}
          <div className={`relative overflow-hidden rounded-2xl border p-6 transition-[colors,transform] duration-500 hover:scale-[1.02] ${
            theme === 'dark' 
              ? 'bg-white/5 border-white/10 hover:bg-white/8' 
              : 'bg-white/70 border-white/20 hover:bg-white/85'
          } shadow-xl hover:shadow-lg`}>
            
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-green-500 to-teal-500" />
            
            <div className="relative z-10">
              <h3 className={`text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Interests & Skills
              </h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/90' : 'text-gray-800'
                  }`}>
                    Current Focus
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['Python', 'R', 'Statistics', 'Data Science', 'Machine Learning', 'Finance'].map((skill) => (
                      <span key={skill} className={`px-3 py-1 rounded-full text-xs font-medium ${
                        theme === 'dark' ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                      }`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className={`font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/90' : 'text-gray-800'
                  }`}>
                    Learning Next
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['C++', 'Quantum Computing', 'Advanced Statistics', 'HFT Algorithms'].map((skill) => (
                      <span key={skill} className={`px-3 py-1 rounded-full text-xs font-medium ${
                        theme === 'dark' ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Shimmer effect removed for performance */}
          </div>
        </div>

        {/* Courses and Certifications Section - Full Width */}
        <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-8 mb-8 transition-[colors,transform] duration-500 hover:scale-[1.02] ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10 hover:bg-white/8' 
            : 'bg-white/70 border-white/20 hover:bg-white/85'
        } shadow-xl hover:shadow-lg`}>
            
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-purple-500 to-pink-500" />
            
            <div className="relative z-10">
              <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-8 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Courses and Certifications
              </h3>
              
              <div className="space-y-10 sm:space-y-8">
                
                {/* Course 1 */}
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                  {/* Logo */}
                  <div 
                    className={`rounded-xl flex items-center justify-center flex-shrink-0`}
                    style={{ width: '36px', height: '36px' }}
                  >
                    <div className={`text-lg ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-400'
                    }`}>
                      <Image
                        src="/icons/companies/DeepLearning.svg"
                        alt="Deep Learning Specialization"
                        width={36}
                        height={36}
                      />
                    </div>
                  </div>
                  
                  {/* Course Name & Provider */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base sm:text-lg font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          <a 
                            href="https://coursera.org/share/0c2e9bb182ed3a65f5a839eef2575be2" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`hover:underline transition-colors duration-300 inline-flex items-center gap-2 group ${
                              theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                            }`}
                          >
                            Machine Learning Specialization
                            <svg className={`w-3 sm:w-4 h-3 sm:h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 ${
                              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                            }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 17L17 7M17 7H8M17 7V16" />
                            </svg>
                          </a>
                        </h4>
                        <p className={`text-sm sm:text-base ${
                          theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                        }`}>
                          Stanford University, Deeplearning.ai (Coursera)
                        </p>
                      </div>
                      
                      {/* Date */}
                      <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0 sm:text-right">
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                        }`}>
                          Sep 2024
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course 2 */}
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                  {/* Logo */}
                  <div 
                    className={`rounded-xl flex items-center justify-center flex-shrink-0`}
                    style={{ width: '36px', height: '36px' }}
                  >
                    <div className={`text-lg ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-400'
                    }`}>
                      <Image
                        src="/icons/companies/IBMLogo.svg.png"
                        alt="IBM LOGO"
                        width={36}
                        height={36}
                      />
                    </div>
                  </div>
                  
                  {/* Course Name & Provider */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-base sm:text-lg font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          <a 
                            href="https://coursera.org/share/56ddf198b626ae52d50259fce412c9c3" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`hover:underline transition-colors duration-300 inline-flex items-center gap-2 group ${
                              theme === 'dark' ? 'hover:text-blue-300' : 'hover:text-blue-600'
                            }`}
                          >
                            Data Science Specialization (Full)
                            <svg className={`w-3 sm:w-4 h-3 sm:h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 ${
                              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
                            }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 17L17 7M17 7H8M17 7V16" />
                            </svg>
                          </a>
                        </h4>
                        <p className={`text-sm sm:text-base ${
                          theme === 'dark' ? 'text-white/80' : 'text-gray-700'
                        }`}>
                          IBM (Coursera)
                        </p>
                      </div>
                      
                      {/* Date */}
                      <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0 sm:text-right">
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
            
            {/* Shimmer effect removed for performance */}
        </div>

        {/* Connect Section */}
        <div className={`relative overflow-hidden rounded-2xl border p-8 transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white/70 border-white/20'
        } shadow-xl`}>
          
          <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-cyan-500 to-blue-500" />
          
          <div className="relative z-10">
            <div className="text-center mb-6">
              <h3 className={`text-2xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Let&apos;s Connect
              </h3>
              <p className={`${
                theme === 'dark' ? 'text-white/70' : 'text-gray-600'
              }`}>
                Feel free to reach out, even just to say hi! You can contact me through any of these platforms.
              </p>
            </div>
          
          <SocialGrid />
          </div>
          
          {/* Shimmer effect removed for performance */}
        </div>
      </main>
    </div>
  );
} 