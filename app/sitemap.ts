import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/config';
import { BLOG_POSTS } from '@/lib/seo/site-data';

const BASE_PAGES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/cars', priority: 0.9, changeFrequency: 'daily' },
    { path: '/blog', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/offers', priority: 0.8, changeFrequency: 'weekly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date().toISOString();

    const coreEntries: MetadataRoute.Sitemap = BASE_PAGES.map((entry) => ({
        url: `${SITE_URL}${entry.path}`,
        lastModified: now,
        changeFrequency: entry.changeFrequency,
        priority: entry.priority,
    }));

    const blogEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
    }));

    return [...coreEntries, ...blogEntries];
}
