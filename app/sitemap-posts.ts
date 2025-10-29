import type { MetadataRoute } from "next";
import { generateLocalizedBlogPostSitemap } from "@/lib/seo/sitemap";

export const dynamic = "force-static";

const sitemapPosts = async (): Promise<MetadataRoute.Sitemap> => {
    return generateLocalizedBlogPostSitemap();
};

export default sitemapPosts;
