import { FALLBACK_HREFLANGS, SITE_URL } from "@/lib/config";

/**
 * Normalizează parametrii din query eliminând orice etichetă de tracking.
 */
const sanitizeSearchParams = (url: URL): void => {
    const removableKeys: string[] = [];
    url.searchParams.forEach((_value, key) => {
        const lowered = key.toLowerCase();
        if (lowered.startsWith("utm_") || lowered === "ref" || lowered === "fbclid") {
            removableKeys.push(key);
        }
    });
    removableKeys.forEach((key) => url.searchParams.delete(key));
};

/**
 * Construiește URL-ul canonic fără parametri de tracking și cu trailing slash consistent.
 */
export const buildCanonicalUrl = (pathOrUrl?: string | URL): string => {
    const base = new URL(SITE_URL + "/");
    const target = pathOrUrl ? new URL(String(pathOrUrl), base) : base;
    sanitizeSearchParams(target);
    const trimmedPath = target.pathname.replace(/\/+$/, "");
    target.pathname = trimmedPath.length > 0 ? trimmedPath : "/";
    return target.toString();
};

/**
 * Generează perechile hreflang pentru limbile suportate.
 */
export const buildHreflangAlternates = (
    pathOrUrl?: string | URL,
    languages: readonly string[] = FALLBACK_HREFLANGS,
): Array<{ hrefLang: string; href: string }> => {
    const canonical = buildCanonicalUrl(pathOrUrl);
    const uniqueLangs = Array.from(new Set(languages));
    return [
        ...uniqueLangs.map((lang) => ({ hrefLang: lang, href: canonical })),
        { hrefLang: "x-default", href: canonical },
    ];
};
