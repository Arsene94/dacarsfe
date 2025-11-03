import { FALLBACK_HREFLANGS, SITE_URL } from "@/lib/config";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE as DEFAULT_I18N_LOCALE } from "@/lib/i18n/config";

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

const TRACKING_PREFIXES = ["utm_"];
const TRACKING_KEYS = new Set(["gclid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);

const CANONICAL_ALLOWED_QUERY_KEYS = new Set(["page"]);

const AVAILABLE_LOCALE_SLUGS = new Set(
    Array.from(AVAILABLE_LOCALES, (entry) => entry.toLowerCase()),
);

const ensureLeadingSlash = (value: string): string => {
    if (!value) {
        return "/";
    }

    return value.startsWith("/") ? value : `/${value}`;
};

const isAbsoluteUrl = (value: string): boolean => ABSOLUTE_URL_PATTERN.test(value);

const toAbsoluteUrl = (target: string | URL | undefined): URL => {
    if (!target) {
        return new URL(SITE_URL);
    }

    if (target instanceof URL) {
        return new URL(target.toString());
    }

    return new URL(target, SITE_URL);
};

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

const prefixLocaleToPathname = (pathname: string, locale: string | null | undefined): string => {
    const normalizedPath = ensureLeadingSlash(pathname.trim());

    if (!locale) {
        return normalizedPath;
    }

    const normalizedLocale = normalizeLocaleSlug(locale);
    if (!normalizedLocale) {
        return normalizedPath;
    }

    const segments = normalizedPath
        .split("/")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

    if (segments.length > 0) {
        const [first, ...rest] = segments;
        const firstSlug = first.toLowerCase();
        if (AVAILABLE_LOCALE_SLUGS.has(firstSlug)) {
            if (firstSlug === normalizedLocale) {
                return `/${[first, ...rest].join("/")}`;
            }

            return `/${[normalizedLocale, ...rest].join("/")}`;
        }
    }

    if (normalizedPath === "/") {
        return `/${normalizedLocale}`;
    }

    return `/${[normalizedLocale, ...segments].join("/")}`;
};

export const resolveLocalizedPathname = (
    pathname: string | URL | undefined,
    locale?: string | null,
): string => {
    if (!pathname) {
        return locale ? `/${normalizeLocaleSlug(locale)}` : "/";
    }

    if (pathname instanceof URL) {
        const clone = new URL(pathname.toString());
        const localizedPath = prefixLocaleToPathname(clone.pathname, locale ?? undefined);
        clone.pathname = localizedPath;
        clone.search = "";
        clone.hash = "";
        return clone.toString();
    }

    if (isAbsoluteUrl(pathname)) {
        const url = new URL(pathname, SITE_URL);
        const localizedPath = prefixLocaleToPathname(url.pathname, locale ?? undefined);
        url.pathname = localizedPath;
        url.search = "";
        url.hash = "";
        return url.toString();
    }

    return prefixLocaleToPathname(pathname, locale ?? undefined);
};

const shouldPreserveCanonicalParam = (key: string, value: string): boolean => {
    if (!CANONICAL_ALLOWED_QUERY_KEYS.has(key)) {
        return false;
    }

    if (key === "page") {
        const trimmed = value.trim();
        if (!trimmed) {
            return false;
        }

        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
            return false;
        }

        return parsed > 1;
    }

    return false;
};

const sanitizeSearch = (url: URL): void => {
    const next = new URLSearchParams();

    url.searchParams.forEach((rawValue, rawKey) => {
        const key = rawKey.toLowerCase();
        if (TRACKING_KEYS.has(key) || TRACKING_PREFIXES.some((prefix) => key.startsWith(prefix))) {
            return;
        }

        const value = rawValue ?? "";
        if (shouldPreserveCanonicalParam(key, value)) {
            next.append(rawKey, value.trim());
        }
    });

    const serialized = next.toString();
    url.search = serialized ? `?${serialized}` : "";
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
