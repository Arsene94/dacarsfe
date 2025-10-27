import type { Locale } from "./config";

const EXTERNAL_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const DEFAULT_EXCLUDED_PREFIXES = ["/_next", "/api", "/admin"] as const;

export type EnsureLocalePathOptions = {
    href: string;
    locale: Locale;
    availableLocales: readonly Locale[];
    excludePrefixes?: readonly string[];
};

export const ensureLocalePath = ({
    href,
    locale,
    availableLocales,
    excludePrefixes = [],
}: EnsureLocalePathOptions): string => {
    if (typeof href !== "string") {
        return href as unknown as string;
    }

    const trimmed = href.trim();
    if (trimmed.length === 0) {
        return trimmed;
    }

    if (
        EXTERNAL_PROTOCOL_PATTERN.test(trimmed) ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("#") ||
        !trimmed.startsWith("/")
    ) {
        return trimmed;
    }

    const prefixesToSkip = [...DEFAULT_EXCLUDED_PREFIXES, ...excludePrefixes];
    if (prefixesToSkip.some((prefix) => trimmed.startsWith(prefix))) {
        return trimmed;
    }

    const url = new URL(trimmed, "https://dacars.internal");
    const { pathname, search, hash } = url;

    const segments = pathname.split("/").filter((segment) => segment.length > 0);
    const hasTrailingSlash = pathname.length > 1 && pathname.endsWith("/");

    if (segments.length === 0) {
        const basePath = `/${locale}`;
        return `${basePath}${hasTrailingSlash ? "/" : ""}${search}${hash}`;
    }

    const normalizedLocales = availableLocales.map((item) => item.toLowerCase());
    const [firstSegment, ...rest] = segments;
    const firstLower = firstSegment.toLowerCase();

    let normalizedSegments: string[];
    if (normalizedLocales.includes(firstLower as Locale)) {
        normalizedSegments = [locale, ...rest];
    } else {
        normalizedSegments = [locale, ...segments];
    }

    let normalizedPath = `/${normalizedSegments.join("/")}`;
    if (hasTrailingSlash && !normalizedPath.endsWith("/")) {
        normalizedPath += "/";
    }

    return `${normalizedPath}${search}${hash}`;
};

export const createLocalePathBuilder = ({
    locale,
    availableLocales,
    excludePrefixes,
}: Omit<EnsureLocalePathOptions, "href">) => {
    return (href: string) => ensureLocalePath({
        href,
        locale,
        availableLocales,
        excludePrefixes,
    });
};
