import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { STATIC_BLOG_POSTS, STATIC_DOCS_PAGES, STATIC_PAGES, resolveStaticUrl } from "@/lib/content/staticEntries";

export const dynamic = "force-static";

const toSitemapEntry = (url: string, lastModified: string, changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"], priority: number): MetadataRoute.Sitemap[0] => ({
    url,
    lastModified,
    changeFrequency,
    priority,
});

export default function sitemap(): MetadataRoute.Sitemap {
    const generatedAt = new Date().toISOString();
    const baseEntries = STATIC_PAGES.map((page) =>
        toSitemapEntry(resolveStaticUrl(page.path), generatedAt, page.changeFrequency, page.priority),
    );

    const docsEntries = STATIC_DOCS_PAGES.map((doc) =>
        toSitemapEntry(resolveStaticUrl(`/docs/${doc.slug}`), doc.lastUpdated, "weekly", 0.7),
    );

    const blogEntries = STATIC_BLOG_POSTS.map((post) =>
        toSitemapEntry(resolveStaticUrl(`/blog/${post.slug}`), post.updatedAt ?? post.publishedAt, "weekly", 0.6),
    );

    return [
        ...baseEntries,
        ...docsEntries,
        ...blogEntries,
        toSitemapEntry(`${SITE_URL}/blog`, generatedAt, "daily", 0.7),
    ];
}
