import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import { generateLocalizedSitemap } from "@/lib/seo/sitemap";

export const runtime = "nodejs";

const buildSitemapXml = (entries: MetadataRoute.Sitemap): string => {
    const urls = entries
        .map(({ url, lastModified, changeFrequency, priority }) => {
            const parts = ["  <url>", `    <loc>${url}</loc>`];

            if (lastModified) {
                const lastModValue =
                    typeof lastModified === "string" ? lastModified : lastModified.toISOString();
                parts.push(`    <lastmod>${lastModValue}</lastmod>`);
            }

            if (changeFrequency) {
                parts.push(`    <changefreq>${changeFrequency}</changefreq>`);
            }

            if (typeof priority === "number") {
                parts.push(`    <priority>${priority.toFixed(1)}</priority>`);
            }

            parts.push("  </url>");
            return parts.join("\n");
        })
        .join("\n");

    return [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
        urls,
        "</urlset>",
    ].join("\n");
};

export async function GET() {
    const entries = await generateLocalizedSitemap();
    const body = buildSitemapXml(entries);

    return new NextResponse(body, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
