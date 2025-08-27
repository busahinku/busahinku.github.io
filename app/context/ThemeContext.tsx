'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  isHydrated: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with dark theme to match server render
  const [theme, setTheme] = useState<Theme>('dark');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This runs only on the client after hydration
    setIsHydrated(true);
    
    // Now we can safely read client-side state
    const savedTheme = localStorage.getItem('theme') as Theme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const actualTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(actualTheme);
    
    // Update the document class to match the actual theme
    document.documentElement.className = actualTheme === 'light' ? 'light' : '';
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.className = newTheme === 'light' ? 'light' : '';
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isHydrated }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}