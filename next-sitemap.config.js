/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://busahinku.github.io',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/admin/*', '/api/*'],
  transform: async (config, path) => {
    // Set custom priorities for different page types
    let priority = 0.7;
    let changefreq = 'weekly';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path.includes('/blog/')) {
      priority = 0.8;
      changefreq = 'monthly';
    } else if (path.includes('/projects/')) {
      priority = 0.8;
      changefreq = 'monthly';
    } else if (path.includes('/about')) {
      priority = 0.9;
      changefreq = 'weekly';
    }

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
        disallow: ['/admin/', '/api/'],
      },
    ],
    additionalSitemaps: [
      'https://busahinku.github.io/sitemap.xml',
    ],
  },
};
