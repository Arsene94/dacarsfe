import { SITE_URL } from '@/lib/config';
import { BLOG_POSTS } from '@/lib/seo/content';

export function GET() {
    const items = BLOG_POSTS.map((post) => {
        const link = `${SITE_URL}/blog/${post.slug}`;
        return `
            <item>
                <title><![CDATA[${post.title}]]></title>
                <link>${link}</link>
                <guid>${link}</guid>
                <description><![CDATA[${post.excerpt}]]></description>
                <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
            </item>
        `;
    }).join('');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DaCars Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Insights și noutăți pentru managerii de flotă DaCars.</description>
    <language>ro-RO</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
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
