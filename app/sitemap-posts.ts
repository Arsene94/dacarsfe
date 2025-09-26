import type { MetadataRoute } from "next";
import { STATIC_BLOG_POSTS, resolveStaticUrl } from "@/lib/content/staticEntries";

export const dynamic = "force-static";

export default function sitemapPosts(): MetadataRoute.Sitemap {
    return STATIC_BLOG_POSTS.map((post) => ({
        url: resolveStaticUrl(`/blog/${post.slug}`),
        lastModified: post.updatedAt ?? post.publishedAt,
        changeFrequency: "weekly",
        priority: 0.6,
    }));
}
