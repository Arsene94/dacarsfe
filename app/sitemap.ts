import type { MetadataRoute } from "next";
import { generateLocalizedSitemap } from "@/lib/seo/sitemap";

export const dynamic = "force-static";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
    return generateLocalizedSitemap();
};

export default sitemap;
