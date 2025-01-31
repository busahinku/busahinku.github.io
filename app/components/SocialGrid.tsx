'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';

export default function SocialGrid() {
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
      darkGradient: 'from-[#1A1A1E] to-[#2D2D2D]',
      lightGradient: 'from-[#F0F0F0] to-[#E0E0E0]',
      gridArea: 'md:col-span-2 md:row-start-1',
    },
    {
      name: 'Spotify',
      icon: {
        dark: '/icons/social/spotify.svg',
        light: '/icons/social/spotify-dark.svg'
      },
      href: 'https://open.spotify.com/user/bzmah384nndroig0y2dh22saw?si=c7dc8de070df45a7',
      description: 'Listening music is my stereotype when I am working.',
      darkGradient: 'from-[#166D2B] to-[#0C3E19]',
      lightGradient: 'from-[#E8F5E9] to-[#C8E6C9]',
      gridArea: 'md:col-span-2 md:row-span-2 md:row-start-1',
    },
    {
      name: 'LinkedIn',
      icon: {
        dark: '/icons/social/linkedin.svg',
        light: '/icons/social/linkedin-dark.svg'
      },
      href: 'https://linkedin.com/in/sahinkucuk',
      description: 'I like to connect with new people',
      darkGradient: 'from-[#163581] to-[#10265E]',
      lightGradient: 'from-[#E3F2FD] to-[#BBDEFB]',
      gridArea: 'md:col-span-2 md:row-span-3 md:row-start-1',
    },
    {
      name: 'Instagram',
      icon: {
        dark: '/icons/social/instagram.svg',
        light: '/icons/social/instagram-dark.svg'
      },
      href: 'https://instagram.com/busahinku',
      description: 'My personal Instagram account',
      darkGradient: 'from-[#9C1552] to-[#8C154A]',
      lightGradient: 'from-[#FCE4EC] to-[#F8BBD0]',
      gridArea: 'md:col-span-2 md:row-start-2',
    },
    {
      name: 'X',
      icon: {
        dark: '/icons/social/twitter.svg',
        light: '/icons/social/twitter-dark.svg'
      },
      href: 'https://twitter.com/busahinku',
      description: 'Some instant thoughts',
      darkGradient: 'from-[#131313] to-[#0E0E0E]',
      lightGradient: 'from-[#FAFAFA] to-[#F5F5F5]',
      gridArea: 'md:col-span-1 md:row-start-3',
    },
    {
      name: 'Email me',
      icon: {
        dark: '/icons/social/email.svg',
        light: '/icons/social/email-dark.svg'
      },
      href: 'mailto:buraksahinkucu@gmail.com',
      description: 'You can freely reach me!',
      darkGradient: 'from-[#111F23] to-[#111F23]',
      lightGradient: 'from-[#E0F7FA] to-[#B2EBF2]',
      gridArea: 'md:col-span-3 md:row-start-3',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[120px] gap-2.5 mt-4">
      {socialLinks.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`bg-gradient-to-br ${
            theme === 'dark' ? link.darkGradient : link.lightGradient
          } ${link.gridArea} rounded-lg p-4 transition-transform hover:scale-[1.02] group relative overflow-hidden col-span-1 ${
            theme === 'dark' ? 'border border-[#313131]' : 'border border-[#DADADA]'
          }`}
        >
          <div className="flex items-start justify-between h-full flex-col">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 relative rounded p-1">
                <Image
                  src={theme === 'dark' ? link.icon.dark : link.icon.light}
                  alt={link.name}
                  fill
                  className="object-contain"
                />
              </div>
              <span className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-[#1A1A1E]'
              }`}>{link.name}</span>
              {link.name !== 'Instagram' && (
                <svg className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                  theme === 'dark' ? 'text-white' : 'text-[#1A1A1E]'
                }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H8M17 7V16" />
                </svg>
              )}
            </div>
            <p className={`text-sm mt-2 ${
              theme === 'dark' ? 'text-white/60' : 'text-[#1A1A1E]/60'
            }`}>{link.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
} 