import { Metadata } from 'next';
import ReadingListClient from './ReadingListClient';

export const metadata: Metadata = {
  title: 'Reading List - busahinku',
  description: 'A curated collection of books I\'m currently reading or plan to read.',
};

export default function ReadingListPage() {
  return <ReadingListClient />;
} 