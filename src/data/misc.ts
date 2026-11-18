// Shared data for the Misc pages (EN + TR). Categories carry both
// languages so the two locales can never drift apart.

export interface MiscEntry {
  title: string;
  url?: string;
  sub?: string;
  category: { en: string; tr: string };
}

export const bookmarks: MiscEntry[] = [
  { title: 'Frontend Masters', url: 'https://frontendmasters.com/', category: { en: 'Learning', tr: 'Öğrenme' } },
  { title: 'Roadmap.sh', url: 'https://roadmap.sh/', category: { en: 'Learning', tr: 'Öğrenme' } },
];
