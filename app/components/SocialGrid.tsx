'use client';

import Link from 'next/link';
import Image from 'next/image';
import { memo } from 'react';
import { useTheme } from '../context/ThemeContext';

const SocialGrid = memo(function SocialGrid() {
  const { theme } = useTheme();

  const socialLinks = [
    {
      name: 'Github',
      icon: {
        dark: '/icons/social/github.svg',
        light: '/icons/social/github-dark.svg'
      },
      href: 'https://github.com/busahinku',
      description: 'Explore my coding projects & contributions',
      gridArea: 'md:col-span-2 md:row-start-1',
      pastelColor: {
        dark: 'bg-purple-500/3 hover:bg-purple-500/6',
        light: 'bg-purple-100/30 hover:bg-purple-100/50'
      }
    },
    {
      name: 'Spotify',
      icon: {
        dark: '/icons/social/spotify.svg',
        light: '/icons/social/spotify-dark.svg'
      },
      href: 'https://open.spotify.com/user/bzmah384nndroig0y2dh22saw?si=c7dc8de070df45a7',
      description: 'Listening to music is my go-to habit while working.',
      gridArea: 'md:col-span-2 md:row-span-2 md:row-start-1',
      pastelColor: {
        dark: 'bg-green-500/3 hover:bg-green-500/6',
        light: 'bg-green-100/30 hover:bg-green-100/50'
      }
    },
    {
      name: 'LinkedIn',
      icon: {
        dark: '/icons/social/linkedin.svg',
        light: '/icons/social/linkedin-dark.svg'
      },
      href: 'https://linkedin.com/in/sahinkucuk',
      description: 'I like to connect with new people',
      gridArea: 'md:col-span-2 md:row-span-3 md:row-start-1',
      pastelColor: {
        dark: 'bg-blue-500/3 hover:bg-blue-500/6',
        light: 'bg-blue-100/30 hover:bg-blue-100/50'
      }
    },
    {
      name: 'Instagram',
      icon: {
        dark: '/icons/social/instagram.svg',
        light: '/icons/social/instagram-dark.svg'
      },
      href: 'https://instagram.com/busahinku',
      description: 'My instagram account I do not use much',
      gridArea: 'md:col-span-2 md:row-start-2',
      pastelColor: {
        dark: 'bg-pink-500/3 hover:bg-pink-500/6',
        light: 'bg-pink-100/30 hover:bg-pink-100/50'
      }
    },
    {
      name: 'X',
      icon: {
        dark: '/icons/social/twitter.svg',
        light: '/icons/social/twitter-dark.svg'
      },
      href: 'https://twitter.com/busahinku',
      description: 'Instant actions',
      gridArea: 'md:col-span-1 md:row-start-3',
      pastelColor: {
        dark: 'bg-slate-500/3 hover:bg-slate-500/6',
        light: 'bg-slate-100/30 hover:bg-slate-100/50'
      }
    },
    {
      name: 'Email me',
      icon: {
        dark: '/icons/social/email.svg',
        light: '/icons/social/email-dark.svg'
      },
      href: 'mailto:sahin.kucuk@metu.edu.tr',
      description: 'You can freely reach me! --> sahin.kucuk@metu.edu.tr',
      gridArea: 'md:col-span-3 md:row-start-3',
      pastelColor: {
        dark: 'bg-cyan-500/3 hover:bg-cyan-500/6',
        light: 'bg-cyan-100/30 hover:bg-cyan-100/50'
      }
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[120px] gap-3 sm:gap-4 mt-6 w-full">
      {socialLinks.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`
            ${link.gridArea} 
            col-span-1
            rounded-2xl p-4 sm:p-6
            transition-all duration-500 ease-out 
            transform hover:scale-105
            group relative overflow-hidden
            ${theme === 'dark' 
              ? `backdrop-blur-xl ${link.pastelColor.dark} border border-white/10 hover:border-white/20` 
              : `backdrop-blur-xl ${link.pastelColor.light} border border-white/30 hover:border-white/50`
            }
            shadow-lg hover:shadow-2xl
          `}
        >
          {/* Glass effect overlay */}
          <div className={`absolute inset-0 rounded-2xl ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-white/5 to-white/0' 
              : 'bg-gradient-to-br from-white/40 to-white/10'
          }`} />
          
          <div className="flex items-start justify-between h-full flex-col relative z-10">
            <div className="flex items-center gap-3 w-full">
              <div className="w-6 h-6 relative">
                <Image
                  src={theme === 'dark' ? link.icon.dark : link.icon.light}
                  alt={`${link.name} social media icon`}
                  fill
                  className="object-contain"
                />
              </div>
              <span className={`font-medium text-base ${
                theme === 'dark' ? 'text-white/90' : 'text-gray-800'
              }`}>{link.name}</span>
              <svg className={`w-4 h-4 ml-auto transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H8M17 7V16" />
              </svg>
            </div>
            <p className={`text-sm mt-3 leading-relaxed ${
              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
            }`}>{link.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
});

export default SocialGrid; 