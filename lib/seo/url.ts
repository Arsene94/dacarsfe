import { FALLBACK_HREFLANGS, SITE_URL } from "@/lib/config";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE as DEFAULT_I18N_LOCALE } from "@/lib/i18n/config";

const TRACKING_PREFIXES = ["utm_"];
const TRACKING_KEYS = new Set(["gclid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);

const toAbsoluteUrl = (target: string | URL | undefined): URL => {
    if (!target) {
        return new URL(SITE_URL);
    }

    if (target instanceof URL) {
        return new URL(target.toString());
    }

    return new URL(target, SITE_URL);
};

const sanitizeSearch = (url: URL): void => {
    const removals: string[] = [];
    url.searchParams.forEach((_value, key) => {
        const normalized = key.toLowerCase();
        if (TRACKING_KEYS.has(normalized) || TRACKING_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
            removals.push(key);
        }
    });

    removals.forEach((key) => {
        url.searchParams.delete(key);
    });
};

const normalizePathname = (url: URL): void => {
    const trimmed = url.pathname.replace(/\/+$/, "");
    url.pathname = trimmed.length > 0 ? trimmed : "/";
};

export const canonical = (pathname: string | URL | undefined = "/"): string => {
    const url = toAbsoluteUrl(pathname);
    sanitizeSearch(url);
    url.hash = "";
    normalizePathname(url);
    return url.toString();
};

type NormalizedHrefLang = {
    hrefLang: string;
    slug: string;
};

const AVAILABLE_LOCALE_SLUGS = new Set(
    Array.from(AVAILABLE_LOCALES, (entry) => entry.toLowerCase()),
);

const normalizeLocaleSlug = (value: string): string => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
        return DEFAULT_I18N_LOCALE;
    }

    if (AVAILABLE_LOCALE_SLUGS.has(trimmed)) {
        return trimmed;
    }

    const [language] = trimmed.split(/[-_]/);
    if (language && AVAILABLE_LOCALE_SLUGS.has(language)) {
        return language;
    }

    return language ?? DEFAULT_I18N_LOCALE;
};

const normalizeHrefLangCandidate = (candidate: string): NormalizedHrefLang | null => {
    if (typeof candidate !== "string" || candidate.trim().length === 0) {
        return null;
    }

    const trimmed = candidate.trim();
    const lower = trimmed.toLowerCase();

    if (lower === "x-default") {
        return {
            hrefLang: "x-default",
            slug: DEFAULT_I18N_LOCALE,
        };
    }

    const [language, region] = lower.split(/[-_]/);
    const slug = normalizeLocaleSlug(lower);
    const hrefLang = region ? `${language}-${region.toUpperCase()}` : language;

    return {
        hrefLang,
        slug,
    };
};

const extractContentSegments = (pathname: string, localeSlugs: ReadonlySet<string>): string[] => {
    const segments = pathname
        .split("/")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
        return segments;
    }

    const [first, ...rest] = segments;
    if (localeSlugs.has(first.toLowerCase())) {
        return rest;
    }

    return segments;
};

const buildLocalizedHref = (baseUrl: URL, slug: string, contentSegments: readonly string[]): string => {
    const url = new URL(baseUrl.toString());
    const normalizedSlug = slug.trim().toLowerCase();

    const segments = normalizedSlug
        ? [normalizedSlug, ...contentSegments]
        : [...contentSegments];

    url.pathname = segments.length > 0 ? `/${segments.join("/")}` : "/";

    return url.toString();
};

export const hreflangLinks = (
    pathname: string | URL | undefined,
    locales: readonly string[] = ["en", "ro"],
): Array<{ hrefLang: string; href: string }> => {
    const canonicalUrl = canonical(pathname);
    const baseUrl = new URL(canonicalUrl);

    const normalizedCandidates = (locales.length > 0 ? locales : ["en", "ro"])
        .map((candidate) => normalizeHrefLangCandidate(candidate))
        .filter((candidate): candidate is NormalizedHrefLang => candidate != null && candidate.hrefLang !== "x-default");

    const dedupedCandidates = Array.from(
        normalizedCandidates.reduce<Map<string, NormalizedHrefLang>>((acc, candidate) => {
            if (!acc.has(candidate.slug)) {
                acc.set(candidate.slug, candidate);
            }
            return acc;
        }, new Map()),
        ([, value]) => value,
    );

    const localeSlugSet = new Set(dedupedCandidates.map((entry) => entry.slug.toLowerCase()));
    const contentSegments = extractContentSegments(baseUrl.pathname, localeSlugSet);

    const entries = dedupedCandidates.map((candidate) => ({
        hrefLang: candidate.hrefLang,
        href: buildLocalizedHref(baseUrl, candidate.slug, contentSegments),
    }));

    const defaultCandidate = dedupedCandidates.find((candidate) => candidate.slug === DEFAULT_I18N_LOCALE);
    const defaultHref = buildLocalizedHref(
        baseUrl,
        defaultCandidate ? defaultCandidate.slug : DEFAULT_I18N_LOCALE,
        contentSegments,
    );

    return [...entries, { hrefLang: "x-default", href: defaultHref }];
};

// Exporturi compatibile cu utilitarele existente în proiect.
export const buildCanonicalUrl = (pathOrUrl?: string | URL): string => canonical(pathOrUrl);
export const buildHreflangAlternates = (
    pathOrUrl?: string | URL,
    languages: readonly string[] = FALLBACK_HREFLANGS,
): Array<{ hrefLang: string; href: string }> => hreflangLinks(pathOrUrl, languages);
