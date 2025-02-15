import { getProjects } from '@/app/utils/getProjects';
import { notFound } from 'next/navigation';
import ClientWrapper from './ClientWrapper';
import { Metadata } from 'next';

// Generate static pages for all projects at build time
export async function generateStaticParams() {
  try {
    const projects = await getProjects();
    return projects.map((project) => ({
      slug: project.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  return {
    title: `${project.title} - busahinku`,
    description: project.description,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  try {
    const projects = await getProjects();
    const project = projects.find((p) => p.slug === slug);

    if (!project) {
      notFound();
    }

    return <ClientWrapper project={project} />;
  } catch (error) {
    console.error('Error loading project:', error);
    notFound();
  }
} 