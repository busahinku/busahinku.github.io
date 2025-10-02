/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://busahinku.github.io',
  generateRobotsTxt: true,
  generateIndexSitemap: false, // Generate single sitemap for static export
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: [
    '/admin/*',
    '/api/*',
    '/404',
    '/500',
    '/rss',
    '/feed',
    '/_next/*',
    '/out/*'
  ],
  additionalPaths: async (config) => {
    const result = [];

    // Add RSS and Atom feeds
    result.push({
      loc: '/rss',
      changefreq: 'daily',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    });

    result.push({
      loc: '/feed',
      changefreq: 'daily',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    });

    return result;
  },
  transform: async (config, path) => {
    // Validate path format
    if (!path || typeof path !== 'string') {
      console.warn(`Invalid path in sitemap: ${path}`);
      return null;
    }

    // Skip if path contains invalid characters
    if (path.includes('..') || path.includes('<') || path.includes('>')) {
      console.warn(`Potentially dangerous path in sitemap: ${path}`);
      return null;
    }

    // Set custom priorities for different page types
    let priority = 0.7;
    let changefreq = 'weekly';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path.includes('/blog/') && !path.endsWith('/blog/')) {
      // Individual blog posts
      priority = 0.8;
      changefreq = 'monthly';
    } else if (path === '/blog') {
      // Blog listing page
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path.includes('/projects/') && !path.endsWith('/projects/')) {
      // Individual project pages
      priority = 0.8;
      changefreq = 'monthly';
    } else if (path === '/projects') {
      // Projects listing page
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path.includes('/about')) {
      priority = 0.9;
      changefreq = 'weekly';
    } else if (path.includes('/misc')) {
      priority = 0.6;
      changefreq = 'monthly';
    }

    // Ensure priority is within valid range
    priority = Math.max(0.0, Math.min(1.0, priority));

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
          '/out/',
          '*.json',
          '/404',
          '/500'
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
    ],
    additionalSitemaps: [
      'https://busahinku.github.io/rss',
      'https://busahinku.github.io/feed',
    ],
  },
};
