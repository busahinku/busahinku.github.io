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

export const books: MiscEntry[] = [
  { title: 'Clean Code', sub: 'Robert C. Martin', category: { en: 'Programming', tr: 'Programlama' } },
  { title: 'The Pragmatic Programmer', sub: 'David Thomas & Andrew Hunt', category: { en: 'Programming', tr: 'Programlama' } },
  { title: 'Designing Data-Intensive Applications', sub: 'Martin Kleppmann', category: { en: 'Systems', tr: 'Sistemler' } },
  { title: 'Atomic Habits', sub: 'James Clear', category: { en: 'Self-Help', tr: 'Kişisel Gelişim' } },
  { title: 'Deep Work', sub: 'Cal Newport', category: { en: 'Productivity', tr: 'Verimlilik' } },
  { title: 'The Design of Everyday Things', sub: 'Don Norman', category: { en: 'Design', tr: 'Tasarım' } },
  { title: 'Thinking, Fast and Slow', sub: 'Daniel Kahneman', category: { en: 'Psychology', tr: 'Psikoloji' } },
  { title: 'Structure and Interpretation of Computer Programs', sub: 'Harold Abelson', category: { en: 'Programming', tr: 'Programlama' } },
  { title: 'Refactoring', sub: 'Martin Fowler', category: { en: 'Programming', tr: 'Programlama' } },
  { title: 'Domain-Driven Design', sub: 'Eric Evans', category: { en: 'Architecture', tr: 'Mimari' } },
];
