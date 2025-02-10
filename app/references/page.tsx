import { Metadata } from 'next';
import ReferencesClient from './ReferencesClient';

export const metadata: Metadata = {
  title: 'References | Burak Şahinkuçuk',
  description: 'Professional references and recommendations.',
};

export default function ReferencesPage() {
  return <ReferencesClient />;
} 