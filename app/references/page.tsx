import { Metadata } from 'next';
import ReferencesClient from './ReferencesClient';


export const metadata: Metadata = {
  title: 'References - busahinku',
  description: 'Thank you for your awesome work.',
};

export default function ReferencesPage() {
  return <ReferencesClient />;
} 