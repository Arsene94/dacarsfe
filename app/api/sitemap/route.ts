import { NextResponse } from "next/server";
import { resolveSiteUrl } from "@/lib/seo/structuredData";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = resolveSiteUrl(rawSiteUrl);

const ROUTES: Array<{ path: string; priority: string; changefreq: string }> = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/cars", priority: "0.9", changefreq: "daily" },
    { path: "/checkout", priority: "0.6", changefreq: "weekly" },
    { path: "/success", priority: "0.4", changefreq: "monthly" },
];

const buildSitemapXml = (): string => {
    const lastmod = new Date().toISOString();

    const urls = ROUTES.map(({ path, priority, changefreq }) => {
        const loc = path === "/" ? siteUrl : `${siteUrl}${path}`;
        return [
            "  <url>",
            `    <loc>${loc}</loc>`,
            `    <lastmod>${lastmod}</lastmod>`,
            `    <changefreq>${changefreq}</changefreq>`,
            `    <priority>${priority}</priority>`,
            "  </url>",
        ].join("\n");
    }).join("\n");

    return [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
        urls,
        "</urlset>",
    ].join("\n");
};

export async function GET() {
    const body = buildSitemapXml();
    return new NextResponse(body, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
