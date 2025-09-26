import { SITE_URL } from '@/lib/config';

const TRACKING_PREFIX = 'utm_';

function ensureAbsolute(pathOrUrl: string): URL {
    const hasProtocol = /^https?:\/\//i.test(pathOrUrl);
    const full = hasProtocol
        ? pathOrUrl
        : `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

    return new URL(full);
}

function stripTrackingParams(url: URL) {
    for (const key of Array.from(url.searchParams.keys())) {
        if (key.toLowerCase().startsWith(TRACKING_PREFIX)) {
            url.searchParams.delete(key);
        }
    }
}

function normalizePathname(url: URL) {
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.replace(/\/+$/, '');
    }
}

export function absolute(pathOrUrl: string): string {
    const url = ensureAbsolute(pathOrUrl);
    stripTrackingParams(url);
    return url.toString();
}

export function canonical(pathname: string): string {
    const url = ensureAbsolute(pathname || '/');
    stripTrackingParams(url);
    normalizePathname(url);
    url.hash = '';
    return url.toString();
}

export type HreflangLink = { rel: 'alternate'; hrefLang: string; href: string };

export function hreflangLinks(locales: string[], path = '/'): HreflangLink[] {
    const links = locales.map((locale, index) => {
        const isDefault = index === 0;
        const targetPath = isDefault
            ? path
            : `${path === '/' ? '' : path}`;
        const localePrefix = isDefault ? '' : `/${locale}`;

        return {
            rel: 'alternate' as const,
            hrefLang: locale,
            href: canonical(`${localePrefix}${targetPath}` || '/'),
        };
    });

    links.push({ rel: 'alternate', hrefLang: 'x-default', href: canonical(path) });

    return links;
}
