'use client';

import { useTheme } from '@/app/context/ThemeContext';

export default function ReferencesClient() {
  const { theme } = useTheme();

  return (
    <main className="flex-1">
      <div className="container mx-auto max-w-[800px] py-28">
        <h1 className={`text-3xl font-bold mb-8 ${
          theme === 'dark' ? 'text-white' : 'text-black'
        }`}>
          References
        </h1>

        <div className="space-y-4">
          <p className={`text-base ${
            theme === 'dark' ? 'text-white/80' : 'text-black/80'
          }`}>
            I was inspired by <a href="https://jarocki.me" target="_blank" rel="noopener noreferrer">Bartosz Jarocki</a>. for the navbar.
          </p>

          <p className={`text-base ${
            theme === 'dark' ? 'text-white/80' : 'text-black/80'
          }`}>
            Card Styles on Blog Page are inspired by <a href="https://astro.build" target="_blank" rel="noopener noreferrer">Astro.build</a>.
          </p>

          <p className={`text-base ${
            theme === 'dark' ? 'text-white/80' : 'text-black/80'
          }`}>
            AI tools were actively used in the construction of the site.
          </p>
        </div>
      </div>
    </main>
  );
} 