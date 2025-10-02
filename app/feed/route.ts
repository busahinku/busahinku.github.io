import { getBlogPosts } from '../utils/getBlogPosts';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const posts = await getBlogPosts();
    const siteUrl = 'https://busahinku.github.io';
    const currentDate = new Date().toISOString();

    const atomXml = `<?xml version="1.0" encoding="UTF-8" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Burak Sahin Kucuk - Blog</title>
  <subtitle>Personal blog about statistics, data science, technology, and life experiences</subtitle>
  <link href="${siteUrl}" />
  <link href="${siteUrl}/feed" rel="self" type="application/atom+xml" />
  <id>${siteUrl}/</id>
  <updated>${currentDate}</updated>
  <author>
    <name>Burak Sahin Kucuk</name>
    <email>sahin.kucuk@metu.edu.tr</email>
    <uri>${siteUrl}</uri>
  </author>
  <generator uri="https://nextjs.org" version="15.1.6">Next.js</generator>
  <logo>${siteUrl}/og-image.png</logo>
  <rights>© ${new Date().getFullYear()} Burak Sahin Kucuk</rights>
  ${posts
    .map(
      (post) => `
  <entry>
    <title type="html"><![CDATA[${post.title}]]></title>
    <link href="${siteUrl}/blog/${post.slug}" />
    <id>${siteUrl}/blog/${post.slug}</id>
    <updated>${new Date(post.date).toISOString()}</updated>
    <published>${new Date(post.date).toISOString()}</published>
    <author>
      <name>Burak Sahin Kucuk</name>
      <email>sahin.kucuk@metu.edu.tr</email>
      <uri>${siteUrl}</uri>
    </author>
    <summary type="html"><![CDATA[${post.description}]]></summary>
    <content type="html"><![CDATA[${post.description}]]></content>
    ${post.tags.map(tag => `<category term="${tag}" label="${tag}" />`).join('\n    ')}
    <media:thumbnail xmlns:media="http://search.yahoo.com/mrss/" url="${post.mainPhoto}" />
  </entry>`
    )
    .join('')}
</feed>`;

    return new Response(atomXml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating Atom feed:', error);
    return new Response('Error generating Atom feed', { status: 500 });
  }
}