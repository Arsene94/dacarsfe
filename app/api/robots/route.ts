import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-static";

const robotsConfig: MetadataRoute.Robots = {
    rules: [
        {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin/", "/account/", "/checkout/", "/cart/", "/*?*utm_*"],
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
};

export const robots: MetadataRoute.Robots = robotsConfig;

const stringifyRobotsRuleValue = (value?: string | string[]): string[] => {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
};

const renderRobots = (config: MetadataRoute.Robots): string => {
    const lines: string[] = [];
    for (const rule of config.rules ?? []) {
        const agents = stringifyRobotsRuleValue(rule.userAgent);
        agents.forEach((agent) => {
            lines.push(`User-agent: ${agent}`);
            stringifyRobotsRuleValue(rule.allow).forEach((allowPath) => {
                lines.push(`Allow: ${allowPath}`);
            });
            stringifyRobotsRuleValue(rule.disallow).forEach((disallowPath) => {
                lines.push(`Disallow: ${disallowPath}`);
            });
            lines.push("");
        });
    }

    const sitemaps = stringifyRobotsRuleValue(config.sitemap);
    sitemaps.forEach((entry) => {
        lines.push(`Sitemap: ${entry}`);
    });

    return lines.join("\n").trim();
};

/**
 * Expunem regulile robots.txt conform cerințelor de indexare și roboți AI.
 */
export function GET() {
    const body = renderRobots(robotsConfig);
    return new NextResponse(`${body}\n`, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}
