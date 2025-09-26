import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/config';

const ROBOTS_CONFIG: MetadataRoute.Robots = {
    rules: [
        {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/account/', '/checkout/', '/cart/', '/*?*utm_*'],
        },
        { userAgent: 'GPTBot', allow: '/' },
        { userAgent: 'CCBot', allow: '/' },
        { userAgent: 'ClaudeBot', allow: '/' },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-posts.xml`],
};

function serializeRobots(config: MetadataRoute.Robots): string {
    const lines: string[] = [];

    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    for (const rule of rules) {
        if (Array.isArray(rule.userAgent)) {
            rule.userAgent.forEach((ua) => lines.push(`User-agent: ${ua}`));
        } else if (rule.userAgent) {
            lines.push(`User-agent: ${rule.userAgent}`);
        }

        if (rule.allow) {
            const allow = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
            allow.forEach((path) => lines.push(`Allow: ${path}`));
        }

        if (rule.disallow) {
            const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
            disallow.forEach((path) => lines.push(`Disallow: ${path}`));
        }

        lines.push('');
    }

    for (const sitemap of config.sitemap ?? []) {
        lines.push(`Sitemap: ${sitemap}`);
    }

    return lines.join('\n').trim() + '\n';
}

export function GET() {
    return new Response(serializeRobots(ROBOTS_CONFIG), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
