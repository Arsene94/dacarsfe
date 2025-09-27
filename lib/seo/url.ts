import { FALLBACK_HREFLANGS, SITE_URL } from "@/lib/config";

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

export const hreflangLinks = (
    pathname: string | URL | undefined,
    locales: readonly string[] = ["en", "ro"],
): Array<{ hrefLang: string; href: string }> => {
    const canonicalUrl = canonical(pathname);
    const uniqueLocales = Array.from(new Set(locales.length > 0 ? locales : ["en", "ro"]));

    const alternates = uniqueLocales.map((locale) => ({
        hrefLang: locale,
        href: canonicalUrl,
    }));

    return [...alternates, { hrefLang: "x-default", href: canonicalUrl }];
};

// Exporturi compatibile cu utilitarele existente în proiect.
export const buildCanonicalUrl = (pathOrUrl?: string | URL): string => canonical(pathOrUrl);
export const buildHreflangAlternates = (
    pathOrUrl?: string | URL,
    languages: readonly string[] = FALLBACK_HREFLANGS,
): Array<{ hrefLang: string; href: string }> => hreflangLinks(pathOrUrl, languages);
