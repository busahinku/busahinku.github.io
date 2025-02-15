import { Metadata } from 'next';
import ToolsClient from './ToolsClient';

export const metadata: Metadata = {
  title: 'Tools & Software - busahinku',
  description: 'A list of tools and software I use daily for development and productivity.',
};

export default function ToolsPage() {
  return <ToolsClient />;
} 