import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { createApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { SITE_URL } from "@/lib/config";
import {
    STATIC_BLOG_POSTS,
    STATIC_DOCS_PAGES,
    STATIC_PAGES,
} from "@/lib/content/staticEntries";
import { AVAILABLE_LOCALES, type Locale } from "@/lib/i18n/config";
import { ensureLocalePath } from "@/lib/i18n/routing";
import type { BlogPost } from "@/types/blog";

type ChangeFrequency = MetadataRoute.Sitemap[0]["changeFrequency"];

type DiscoveredPage = {
    path: string;
    lastModified: string;
};

export type SitemapEntry = {
    path: string;
    lastModified: string;
    changeFrequency: ChangeFrequency;
    priority: number;
};

const APP_DIRECTORY = path.join(process.cwd(), "app");
const PAGE_FILE_NAMES = new Set(["page.tsx", "page.mdx", "page.ts", "page.jsx"]);
const EXCLUDED_SEGMENTS = new Set(["api", "admin"]);
const DEFAULT_CHANGE_FREQUENCY: ChangeFrequency = "monthly";
const DEFAULT_PRIORITY = 0.5;
const DEFAULT_EXCLUDES = ["/admin", "/api"] as const;
const BLOG_SITEMAP_FETCH_LIMIT = 500;

const STATIC_DISCOVERY_CACHE_TAG = "seo-static-pages" as const;
const STATIC_DISCOVERY_REVALIDATE_SECONDS = 60 * 60; // 1 oră
const BLOG_SITEMAP_CACHE_TAG = "seo-blog-sitemap" as const;
const DYNAMIC_ENTRIES_CACHE_TAG = "seo-dynamic-pages" as const;
const DYNAMIC_ENTRIES_REVALIDATE_SECONDS = 60 * 10; // 10 minute
const SITEMAP_CACHE_TAG = "seo-sitemap-entries" as const;
const SITEMAP_REVALIDATE_SECONDS = 60 * 10; // 10 minute
const BLOG_SITEMAP_PARAMS = {
    status: "published",
    sort: "-published_at,-id",
    limit: BLOG_SITEMAP_FETCH_LIMIT,
    fields: "id,slug,published_at,updated_at",
} as const;

const FREQUENCY_WEIGHT: Record<Exclude<ChangeFrequency, undefined>, number> = {
    always: 6,
    hourly: 5,
    daily: 4,
    weekly: 3,
    monthly: 2,
    yearly: 1,
    never: 0,
};

const ensureLeadingSlash = (value: string): string => {
    if (!value.startsWith("/")) {
        return `/${value}`;
    }
    return value;
};

const isDynamicSegment = (segment: string): boolean => segment.includes("[");
const isRouteGroup = (segment: string): boolean => segment.startsWith("(") && segment.endsWith(")");
const isParallelRoute = (segment: string): boolean => segment.startsWith("@");
const isPrivateSegment = (segment: string): boolean => segment.startsWith("_");
const isFileRoute = (segment: string): boolean => segment.includes(".");

const toDiscoveredPage = (segments: string[], lastModified: Date | null): DiscoveredPage => {
    const pathSegments = segments.length ? segments : [""];
    const normalizedPath = `/${pathSegments.filter(Boolean).join("/")}` || "/";
    const lastModifiedValue = (lastModified ?? new Date()).toISOString();
    return {
        path: normalizedPath === "//" ? "/" : normalizedPath,
        lastModified: lastModifiedValue,
    };
};

const pickLatestDate = (first: string, second: string): string => {
    const firstTime = Date.parse(first);
    const secondTime = Date.parse(second);

    if (Number.isNaN(firstTime) && Number.isNaN(secondTime)) {
        return first;
    }

    if (Number.isNaN(firstTime)) {
        return second;
    }

    if (Number.isNaN(secondTime)) {
        return first;
    }

    return secondTime > firstTime ? second : first;
};

const pickMostFrequent = (
    first: ChangeFrequency,
    second: ChangeFrequency,
): ChangeFrequency => {
    if (!first) {
        return second;
    }

    if (!second) {
        return first;
    }

    const firstWeight = FREQUENCY_WEIGHT[first];
    const secondWeight = FREQUENCY_WEIGHT[second];

    if (secondWeight > firstWeight) {
        return second;
    }

    return first;
};

const mergeEntries = (base: SitemapEntry, incoming: SitemapEntry): SitemapEntry => {
    return {
        path: base.path,
        lastModified: pickLatestDate(base.lastModified, incoming.lastModified),
        changeFrequency: pickMostFrequent(base.changeFrequency, incoming.changeFrequency),
        priority: Math.max(base.priority, incoming.priority),
    };
};

const discoverStaticPages = async (
    directory = APP_DIRECTORY,
    segments: string[] = [],
): Promise<DiscoveredPage[]> => {
    const dirEntries = await readdir(directory, { withFileTypes: true });

    let pageTimestamp: Date | null = null;
    for (const entry of dirEntries) {
        if (entry.isFile() && PAGE_FILE_NAMES.has(entry.name)) {
            const stats = await stat(path.join(directory, entry.name));
            if (!pageTimestamp || stats.mtime > pageTimestamp) {
                pageTimestamp = stats.mtime;
            }
        }
    }

    const discovered: DiscoveredPage[] = [];
    if (pageTimestamp) {
        const hasDynamic = segments.some((segment) => isDynamicSegment(segment));
        if (!hasDynamic) {
            discovered.push(toDiscoveredPage(segments, pageTimestamp));
        }
    }

    for (const entry of dirEntries) {
        if (!entry.isDirectory()) {
            continue;
        }

        const name = entry.name;
        if (EXCLUDED_SEGMENTS.has(name) || isParallelRoute(name) || isPrivateSegment(name) || isFileRoute(name)) {
            continue;
        }

        const nextDirectory = path.join(directory, name);
        if (isRouteGroup(name)) {
            discovered.push(...(await discoverStaticPages(nextDirectory, segments)));
            continue;
        }

        if (isDynamicSegment(name)) {
            continue;
        }

        discovered.push(...(await discoverStaticPages(nextDirectory, [...segments, name])));
    }

    return discovered;
};

const applyOverrides = (discovered: DiscoveredPage[], generatedAt: string): SitemapEntry[] => {
    const overrides = new Map<string, { changeFrequency?: ChangeFrequency; priority?: number }>([
        ...STATIC_PAGES.map(
            (page) =>
                [
                    page.path,
                    { changeFrequency: page.changeFrequency, priority: page.priority },
                ] as const,
        ),
        ["/blog", { changeFrequency: "daily", priority: 0.7 }],
    ]);

    return discovered.map((page) => {
        const override = overrides.get(page.path);
        return {
            path: page.path,
            lastModified: page.lastModified ?? generatedAt,
            changeFrequency: override?.changeFrequency ?? DEFAULT_CHANGE_FREQUENCY,
            priority: override?.priority ?? DEFAULT_PRIORITY,
        };
    });
};

const normalizeIsoDate = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString();
};

type BlogSitemapSource = {
    slug?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
};

const createBlogSitemapEntry = ({
    slug,
    publishedAt,
    updatedAt,
}: BlogSitemapSource): SitemapEntry | null => {
    const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
    if (!normalizedSlug) {
        return null;
    }

    const lastModified =
        normalizeIsoDate(updatedAt) ??
        normalizeIsoDate(publishedAt) ??
        new Date().toISOString();

    return {
        path: `/blog/${normalizedSlug}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.6,
    };
};

const fallbackBlogSitemapEntries = (): SitemapEntry[] =>
    STATIC_BLOG_POSTS.map((post) =>
        createBlogSitemapEntry({
            slug: post.slug,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
        }),
    ).filter((entry): entry is SitemapEntry => entry !== null);

const fetchBlogSitemapEntries = async (): Promise<SitemapEntry[]> => {
    try {
        const client = createApiClient();
        const response = await client.getBlogPosts(BLOG_SITEMAP_PARAMS);
        const posts = extractList<BlogPost>(response);

        return posts
            .map((post) =>
                createBlogSitemapEntry({
                    slug: post.slug,
                    publishedAt: post.published_at ?? null,
                    updatedAt: post.updated_at ?? null,
                }),
            )
            .filter((entry): entry is SitemapEntry => entry !== null);
    } catch (error) {
        console.error("Nu am putut încărca articolele pentru sitemap", error);
        return fallbackBlogSitemapEntries();
    }
};

const cachedFetchBlogSitemapEntries = unstable_cache(
    fetchBlogSitemapEntries,
    ["seo-fetch-blog-sitemap"],
    { tags: [BLOG_SITEMAP_CACHE_TAG], revalidate: DYNAMIC_ENTRIES_REVALIDATE_SECONDS },
);

const collectDynamicEntries = async (): Promise<SitemapEntry[]> => {
    const docsEntries: SitemapEntry[] = STATIC_DOCS_PAGES.map((doc) => ({
        path: `/docs/${doc.slug}`,
        lastModified: doc.lastUpdated,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    const blogEntries = await cachedFetchBlogSitemapEntries();

    return [...docsEntries, ...blogEntries];
};

export const dedupeSitemapEntries = (entries: Iterable<SitemapEntry>): SitemapEntry[] => {
    const byPath = new Map<string, SitemapEntry>();

    for (const entry of entries) {
        const normalizedPath = entry.path === "" ? "/" : ensureLeadingSlash(entry.path);
        const existing = byPath.get(normalizedPath);
        if (!existing) {
            byPath.set(normalizedPath, { ...entry, path: normalizedPath });
            continue;
        }

        byPath.set(normalizedPath, mergeEntries(existing, { ...entry, path: normalizedPath }));
    }

    return Array.from(byPath.values());
};

const toAbsoluteUrl = (pathSegment: string): string => {
    const normalized = pathSegment === "/" ? "/" : ensureLeadingSlash(pathSegment);
    if (normalized === "/") {
        return SITE_URL;
    }

    return `${SITE_URL}${normalized}`;
};

const formatPriority = (priority: number): number => {
    if (!Number.isFinite(priority)) {
        return DEFAULT_PRIORITY;
    }

    return Math.max(0, Math.min(1, Number(priority)));
};

export const buildLocalizedSitemapUrls = (
    entries: Iterable<SitemapEntry>,
    locales: readonly Locale[] = AVAILABLE_LOCALES,
): MetadataRoute.Sitemap => {
    const localizedLocales = locales.length > 0 ? locales : AVAILABLE_LOCALES;
    const urlMap = new Map<string, MetadataRoute.Sitemap[0]>();

    const register = (pathSegment: string, entry: SitemapEntry) => {
        const absoluteUrl = toAbsoluteUrl(pathSegment);
        const existing = urlMap.get(absoluteUrl);
        const normalizedLastModified = entry.lastModified;
        const candidateLastModified = Date.parse(normalizedLastModified);

        if (existing) {
            const existingLastModified = existing.lastModified
                ? Date.parse(existing.lastModified instanceof Date
                    ? existing.lastModified.toISOString()
                    : existing.lastModified)
                : Number.NaN;

            if (!Number.isNaN(candidateLastModified) &&
                (Number.isNaN(existingLastModified) || candidateLastModified > existingLastModified)) {
                urlMap.set(absoluteUrl, {
                    url: absoluteUrl,
                    lastModified: normalizedLastModified,
                    changeFrequency: entry.changeFrequency,
                    priority: formatPriority(entry.priority),
                });
            }
            return;
        }

        urlMap.set(absoluteUrl, {
            url: absoluteUrl,
            lastModified: normalizedLastModified,
            changeFrequency: entry.changeFrequency,
            priority: formatPriority(entry.priority),
        });
    };

    for (const entry of entries) {
        register(entry.path, entry);

        for (const locale of localizedLocales) {
            const localizedPath = ensureLocalePath({
                href: entry.path,
                locale,
                availableLocales: localizedLocales,
                excludePrefixes: DEFAULT_EXCLUDES,
            });
            register(localizedPath, entry);
        }
    }

    return Array.from(urlMap.values());
};

const cachedDiscoverStaticPages = unstable_cache(
    async () => discoverStaticPages(),
    ["seo-discover-static"],
    { tags: [STATIC_DISCOVERY_CACHE_TAG], revalidate: STATIC_DISCOVERY_REVALIDATE_SECONDS },
);

const cachedCollectDynamicEntries = unstable_cache(
    collectDynamicEntries,
    ["seo-collect-dynamic"],
    {
        tags: [DYNAMIC_ENTRIES_CACHE_TAG, BLOG_SITEMAP_CACHE_TAG],
        revalidate: DYNAMIC_ENTRIES_REVALIDATE_SECONDS,
    },
);

const generateSitemapEntriesInternal = async (): Promise<SitemapEntry[]> => {
    const generatedAt = new Date().toISOString();
    const [staticPages, dynamicEntries] = await Promise.all([
        cachedDiscoverStaticPages(),
        cachedCollectDynamicEntries(),
    ]);
    const baseEntries = applyOverrides(staticPages, generatedAt);

    return dedupeSitemapEntries([...baseEntries, ...dynamicEntries]);
};

export const generateSitemapEntries = unstable_cache(
    generateSitemapEntriesInternal,
    ["seo-generate-entries"],
    { tags: [SITEMAP_CACHE_TAG, STATIC_DISCOVERY_CACHE_TAG, DYNAMIC_ENTRIES_CACHE_TAG], revalidate: SITEMAP_REVALIDATE_SECONDS },
);

export const generateLocalizedSitemap = async (): Promise<MetadataRoute.Sitemap> => {
    const entries = await generateSitemapEntries();
    return buildLocalizedSitemapUrls(entries);
};

export const generateLocalizedBlogPostSitemap = async (): Promise<MetadataRoute.Sitemap> => {
    const blogEntries = await fetchBlogSitemapEntries();
    return buildLocalizedSitemapUrls(dedupeSitemapEntries(blogEntries));
};

