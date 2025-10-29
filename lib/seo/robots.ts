import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export const ROBOTS_CONFIG: MetadataRoute.Robots = {
    rules: [
        {
            userAgent: "*",
            allow: ["/"],
            disallow: [
                "/admin/",
                "/account/",
                "/form/",
                "/cart/",
                "/checkout/",
                "/api/",
                "/*?*=&*",
                "/*?*utm_*",
                "/*?*fbclid*",
            ],
        },
        {
            userAgent: "GPTBot",
            allow: "/",
        },
        {
            userAgent: "CCBot",
            allow: "/",
        },
        {
            userAgent: "ClaudeBot",
            allow: "/",
        },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-posts.xml`],
    host: SITE_URL,
};
