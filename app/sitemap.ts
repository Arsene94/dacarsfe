import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/config';
import { BLOG_POSTS, DOCS_PAGES, STATIC_PAGES } from '@/lib/seo/content';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date().toISOString();

    const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
        url: `${SITE_URL}${page.path}`,
        lastModified: now,
        changeFrequency: page.changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
        priority: page.priority,
    }));

    const docEntries: MetadataRoute.Sitemap = DOCS_PAGES.map((doc) => ({
        url: `${SITE_URL}/docs/${doc.slug}`,
        lastModified: doc.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt ?? post.publishedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
    }));

    return [...staticEntries, ...docEntries, ...blogEntries];
}
