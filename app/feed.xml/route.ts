import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { STATIC_BLOG_POSTS } from "@/lib/content/staticEntries";

export const dynamic = "force-static";

/**
 * Generează feed RSS 2.0 pentru articolele statice din blog.
 */
export function GET() {
    const items = STATIC_BLOG_POSTS.map((post) => `
        <item>
            <title><![CDATA[${post.title}]]></title>
            <link>${SITE_URL}/blog/${post.slug}</link>
            <guid>${SITE_URL}/blog/${post.slug}</guid>
            <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
            <description><![CDATA[${post.excerpt}]]></description>
        </item>
    `).join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog DaCars</title>
    <link>${SITE_URL}/blog</link>
    <description>Noutăți și ghiduri despre închirierile auto DaCars.</description>
    <language>ro-RO</language>
    ${items}
  </channel>
</rss>`;

    return new NextResponse(rss, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
        },
    });
}
