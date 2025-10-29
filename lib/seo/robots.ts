import type { MetadataRoute } from "next";
import { AVAILABLE_LOCALES } from "@/lib/i18n/config";
import { ensureLocalePath } from "@/lib/i18n/routing";
import { SITE_URL } from "@/lib/config";
import { generateSitemapEntries } from "@/lib/seo/sitemap";

const ALWAYS_DISALLOWED: string[] = [
    "/admin/",
    "/account/",
    "/form/",
    "/cart/",
    "/checkout/",
    "/api/",
    "/*?*&*",
    "/*?*=&*",
    "/*?*utm_*",
    "/*?*fbclid*",
];

// Permitem o singură variabilă de interogare și blocăm scenariile cu multipli parametri
// pentru a respecta cerința de "follow" doar pentru primul parametru.
const FOLLOW_FIRST_PARAMETER_ALLOW = ["/*?*"] as const;

const ensureLeadingSlash = (value: string): string => {
    if (!value.startsWith("/")) {
        return `/${value}`;
    }
    return value;
};

const normalizeAllowPath = (pathSegment: string): string => {
    if (!pathSegment || pathSegment === "/") {
        return "/";
    }

    return ensureLeadingSlash(pathSegment);
};

const buildAllowList = (paths: string[]): string[] => {
    const uniquePaths = new Set<string>(["/"]);

    for (const pathSegment of paths) {
        uniquePaths.add(normalizeAllowPath(pathSegment));
    }

    FOLLOW_FIRST_PARAMETER_ALLOW.forEach((rule) => {
        uniquePaths.add(rule);
    });

    return Array.from(uniquePaths).sort();
};

const collectAllowPaths = (entries: Awaited<ReturnType<typeof generateSitemapEntries>>): string[] => {
    const paths: string[] = [];

    for (const entry of entries) {
        paths.push(entry.path);

        for (const locale of AVAILABLE_LOCALES) {
            const localized = ensureLocalePath({
                href: entry.path,
                locale,
                availableLocales: AVAILABLE_LOCALES,
                excludePrefixes: ["/admin", "/api"],
            });
            paths.push(localized);
        }
    }

    return buildAllowList(paths);
};

export const generateRobotsConfig = async (): Promise<MetadataRoute.Robots> => {
    const entries = await generateSitemapEntries();
    const allowPaths = collectAllowPaths(entries);

    return {
        rules: [
            {
                userAgent: "*",
                allow: allowPaths,
                disallow: ALWAYS_DISALLOWED,
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
};
