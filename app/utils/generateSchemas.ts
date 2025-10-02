import type { BlogPost } from './getBlogPosts';
import type { Project } from './getProjects';

export interface BlogPostSchemaData {
  post: BlogPost;
  url: string;
}

export interface ProjectSchemaData {
  project: Project;
  url: string;
}

/**
 * Generate structured data for blog posts
 */
export function generateBlogPostSchema({ post, url }: BlogPostSchemaData) {
  const baseUrl = 'https://busahinku.github.io';

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${baseUrl}${url}#article`,
    headline: post.title,
    description: post.description,
    image: {
      '@type': 'ImageObject',
      url: post.mainPhoto,
      width: 1200,
      height: 630,
      caption: `Featured image for: ${post.title}`
    },
    datePublished: new Date(post.date).toISOString(),
    dateModified: new Date(post.date).toISOString(),
    author: {
      '@type': 'Person',
      '@id': `${baseUrl}/#person`,
      name: 'Burak Sahin Kucuk',
      url: baseUrl,
      image: `${baseUrl}/images/profile.jpg`
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'Burak Sahin Kucuk Blog',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}${url}`
    },
    keywords: post.tags.join(', '),
    articleSection: 'Technology',
    wordCount: post.readingTime.words,
    timeRequired: `PT${post.readingTime.minutes}M`,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    copyrightHolder: {
      '@id': `${baseUrl}/#person`
    },
    copyrightYear: new Date(post.date).getFullYear(),
    about: post.tags.map(tag => ({
      '@type': 'Thing',
      name: tag
    })),
    mentions: post.tags.map(tag => ({
      '@type': 'Thing',
      name: tag
    }))
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${baseUrl}/blog`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `${baseUrl}${url}`
      }
    ]
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [articleSchema, breadcrumbSchema]
  };
}

/**
 * Generate structured data for project pages
 */
export function generateProjectSchema({ project, url }: ProjectSchemaData) {
  const baseUrl = 'https://busahinku.github.io';

  const projectSchema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${baseUrl}${url}#project`,
    name: project.title,
    description: project.description,
    image: {
      '@type': 'ImageObject',
      url: project.mainPhoto,
      width: 1200,
      height: 630,
      caption: `Screenshot of: ${project.title}`
    },
    dateCreated: new Date(project.date).toISOString(),
    datePublished: new Date(project.date).toISOString(),
    creator: {
      '@type': 'Person',
      '@id': `${baseUrl}/#person`,
      name: 'Burak Sahin Kucuk'
    },
    author: {
      '@id': `${baseUrl}/#person`
    },
    publisher: {
      '@id': `${baseUrl}/#organization`
    },
    keywords: project.tags.join(', '),
    genre: project.type,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    copyrightHolder: {
      '@id': `${baseUrl}/#person`
    },
    copyrightYear: new Date(project.date).getFullYear(),
    ...(project.demoUrl && {
      url: project.demoUrl,
      sameAs: [project.demoUrl]
    }),
    ...(project.githubUrl && {
      codeRepository: project.githubUrl
    })
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Projects',
        item: `${baseUrl}/projects`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: project.title,
        item: `${baseUrl}${url}`
      }
    ]
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [projectSchema, breadcrumbSchema]
  };
}

/**
 * Generate structured data for the blog listing page
 */
export function generateBlogListingSchema(posts: BlogPost[]) {
  const baseUrl = 'https://busahinku.github.io';

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/blog#page`,
    name: 'Blog - Burak Sahin Kucuk',
    description: 'Personal blog about statistics, data science, technology, and life experiences',
    url: `${baseUrl}/blog`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          '@id': `${baseUrl}/blog/${post.slug}#article`,
          headline: post.title,
          description: post.description,
          url: `${baseUrl}/blog/${post.slug}`,
          datePublished: new Date(post.date).toISOString(),
          author: {
            '@id': `${baseUrl}/#person`
          },
          image: post.mainPhoto
        }
      }))
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `${baseUrl}/blog`
        }
      ]
    }
  };
}

/**
 * Generate structured data for the projects listing page
 */
export function generateProjectListingSchema(projects: Project[]) {
  const baseUrl = 'https://busahinku.github.io';

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/projects#page`,
    name: 'Projects - Burak Sahin Kucuk',
    description: 'Portfolio of data science, web development, and programming projects',
    url: `${baseUrl}/projects`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'CreativeWork',
          '@id': `${baseUrl}/projects/${project.slug}#project`,
          name: project.title,
          description: project.description,
          url: `${baseUrl}/projects/${project.slug}`,
          dateCreated: new Date(project.date).toISOString(),
          creator: {
            '@id': `${baseUrl}/#person`
          },
          image: project.mainPhoto
        }
      }))
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Projects',
          item: `${baseUrl}/projects`
        }
      ]
    }
  };
}