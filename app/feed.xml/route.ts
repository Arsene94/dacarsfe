import { SITE_NAME, SITE_URL } from '@/lib/config';
import { BLOG_POSTS } from '@/lib/seo/site-data';

export function GET() {
    const latestUpdate = BLOG_POSTS.reduce<string>((acc, post) => {
        return !acc || new Date(post.updatedAt) > new Date(acc) ? post.updatedAt : acc;
    }, new Date().toISOString());

    const items = BLOG_POSTS.map((post) => {
        const link = `${SITE_URL}/blog/${post.slug}`;
        return `
            <item>
                <title><![CDATA[${post.title}]]></title>
                <link>${link}</link>
                <guid>${link}</guid>
                <description><![CDATA[${post.excerpt}]]></description>
                <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
                <updated>${new Date(post.updatedAt).toUTCString()}</updated>
            </item>
        `;
    }).join('');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME} Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Articole despre optimizarea operațiunilor de închirieri auto.</description>
    <language>ro-RO</language>
    <lastBuildDate>${new Date(latestUpdate).toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

    return new Response(body, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
