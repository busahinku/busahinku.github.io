import { getBlogPosts } from '../utils/getBlogPosts';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const posts = await getBlogPosts();
    const siteUrl = 'https://busahinku.github.io';

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Burak Sahin Kucuk - Blog</title>
    <description>Personal blog about statistics, data science, technology, and life experiences</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>sahin.kucuk@metu.edu.tr (Burak Sahin Kucuk)</managingEditor>
    <webMaster>sahin.kucuk@metu.edu.tr (Burak Sahin Kucuk)</webMaster>
    <generator>Next.js RSS Generator</generator>
    <category>Technology</category>
    <category>Statistics</category>
    <category>Data Science</category>
    <ttl>60</ttl>
    <image>
      <url>${siteUrl}/og-image.png</url>
      <title>Burak Sahin Kucuk - Blog</title>
      <link>${siteUrl}</link>
      <description>Personal blog about statistics, data science, technology, and life experiences</description>
      <width>144</width>
      <height>144</height>
    </image>
    ${posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description}]]></description>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>sahin.kucuk@metu.edu.tr (Burak Sahin Kucuk)</author>
      ${post.tags.map(tag => `<category><![CDATA[${tag}]]></category>`).join('\n      ')}
      <enclosure url="${post.mainPhoto}" type="image/jpeg" length="0" />
    </item>`
      )
      .join('')}
  </channel>
</rss>`;

    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new Response('Error generating RSS feed', { status: 500 });
  }
}