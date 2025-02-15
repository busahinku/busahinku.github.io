import MiscClient from './MiscClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Misc - busahinku',
  description: 'A collection of miscellaneous content.',
};



export default function MiscPage() {
  return <MiscClient />;
} 