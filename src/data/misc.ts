// Shared data for the Misc pages (EN + TR). Categories carry both
// languages so the two locales can never drift apart.

export interface MiscEntry {
  title: string;
  url?: string;
  sub?: string;
  category: { en: string; tr: string };
}

export const bookmarks: MiscEntry[] = [
  { title: 'Refactoring UI', url: 'https://www.refactoringui.com/', category: { en: 'Design', tr: 'Tasarım' } },
  { title: 'Realtime Colors', url: 'https://www.realtimecolors.com/', category: { en: 'Design', tr: 'Tasarım' } },
  { title: 'Josh W Comeau', url: 'https://www.joshwcomeau.com/', category: { en: 'Blog', tr: 'Blog' } },
  { title: 'Syntax.fm', url: 'https://syntax.fm/', category: { en: 'Podcast', tr: 'Podcast' } },
  { title: 'Frontend Masters', url: 'https://frontendmasters.com/', category: { en: 'Learning', tr: 'Öğrenme' } },
  { title: 'Roadmap.sh', url: 'https://roadmap.sh/', category: { en: 'Learning', tr: 'Öğrenme' } },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/', category: { en: 'Docs', tr: 'Dokümanlar' } },
  { title: 'Can I Use', url: 'https://caniuse.com/', category: { en: 'Tools', tr: 'Araçlar' } },
  { title: 'Dribbble', url: 'https://dribbble.com/', category: { en: 'Design', tr: 'Tasarım' } },
  { title: 'Awwwards', url: 'https://www.awwwards.com/', category: { en: 'Design', tr: 'Tasarım' } },
  { title: 'CodePen', url: 'https://codepen.io/', category: { en: 'Tools', tr: 'Araçlar' } },
  { title: 'GitHub', url: 'https://github.com/', category: { en: 'Tools', tr: 'Araçlar' } },
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

