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
  { title: 'Bir Bilim Adamının Romanı', sub: 'Oğuz Atay', category: { en: 'Literature', tr: 'Edebiyat' } },
  { title: 'Gençlerle Başbaşa', sub: 'Ord. Prof. Dr. Ali Fuad Başgil', category: { en: 'Literature', tr: 'Edebiyat' } },
  { title: 'Designing Data-Intensive Applications', sub: 'Martin Kleppmann', category: { en: 'Systems', tr: 'Sistemler' } },
  { title: 'Atomic Habits', sub: 'James Clear', category: { en: 'Self-Help', tr: 'Kişisel Gelişim' } },
  { title: 'The Design of Everyday Things', sub: 'Don Norman', category: { en: 'Design', tr: 'Tasarım' } },
];
