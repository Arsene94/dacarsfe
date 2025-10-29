import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import { generateRobotsConfig } from "@/lib/seo/robots";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const stringifyRobotsRuleValue = (value?: string | string[]): string[] => {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
};

const renderRobots = (config: MetadataRoute.Robots): string => {
    const lines: string[] = [];
    const ruleEntries = config.rules
        ? Array.isArray(config.rules)
            ? config.rules
            : [config.rules]
        : [];
    for (const rule of ruleEntries) {
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
export async function GET() {
    const config = await generateRobotsConfig();
    const body = renderRobots(config);
    return new NextResponse(`${body}\n`, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}
