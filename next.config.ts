/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  experimental: {
    optimizePackageImports: [
      'react-markdown',
      'remark-gfm',
      'rehype-katex',
      'prism-react-renderer'
    ]
  },
  // Bundle analysis configuration
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Only run bundle analyzer in production build with ANALYZE=true
    if (!isServer && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: true,
          generateStatsFile: true,
          statsFilename: 'bundle-stats.json',
          reportFilename: 'bundle-report.html'
        })
      );
    }
    return config;
  }
}

export default nextConfig;
