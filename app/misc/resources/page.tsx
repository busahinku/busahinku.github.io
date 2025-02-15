import { Metadata } from 'next';
import ResourcesClient from './ResourcesClient';

export const metadata: Metadata = {
  title: 'Learning Resources | Burak Şahinkuçuk',
  description: 'Collection of resources I find helpful for learning new technologies.',
};

export default function ResourcesPage() {
  return <ResourcesClient />;
} 