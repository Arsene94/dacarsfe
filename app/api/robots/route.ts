import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/config';

const ROBOTS: MetadataRoute.Robots = {
    rules: [
        {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/admin/', '/account', '/account/', '/cart', '/checkout', '/*?*utm_*'],
        },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`],
};

function serialize(config: MetadataRoute.Robots): string {
    const lines: string[] = [];
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

    for (const rule of rules) {
        const userAgents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
        userAgents.filter(Boolean).forEach((ua) => lines.push(`User-agent: ${ua}`));

        if (rule.allow) {
            (Array.isArray(rule.allow) ? rule.allow : [rule.allow]).forEach((path) => lines.push(`Allow: ${path}`));
        }

        if (rule.disallow) {
            (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]).forEach((path) => lines.push(`Disallow: ${path}`));
        }

        lines.push('');
    }

    for (const sitemap of config.sitemap ?? []) {
        lines.push(`Sitemap: ${sitemap}`);
    }

    return `${lines.join('\n').trim()}\n`;
}

export function GET() {
    return new Response(serialize(ROBOTS), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
