import { SITE_URL, SUPPORTED_LANGUAGES } from '@/lib/config';

const TRACKING_PREFIX = 'utm_';

/**
 * Normalizează și construiește URL-ul canonical fără parametri de tracking.
 */
export function buildCanonicalUrl(pathOrUrl: string): string {
    const hasProtocol = /^https?:\/\//i.test(pathOrUrl);
    const base = hasProtocol ? pathOrUrl : `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    const url = new URL(base);

    // Eliminăm parametrii de tracking (utm_*) și dublurile goale.
    for (const key of Array.from(url.searchParams.keys())) {
        if (key.startsWith(TRACKING_PREFIX) || url.searchParams.get(key) === '') {
            url.searchParams.delete(key);
        }
    }

    // Curățăm trailing slash pentru ruta principală.
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.replace(/\/+$/, '');
    }

    url.hash = '';
    return url.toString();
}

export type HreflangDescriptor = {
    /** Codul de limbă conform BCP 47. */
    locale: (typeof SUPPORTED_LANGUAGES)[number];
    /** Segment de rută specific limbii (ex: `/ro`). */
    path?: string;
};

/**
 * Generează link-urile hreflang pentru head pentru limbile disponibile.
 */
export function buildHreflangLinks(pathname: string, overrides?: HreflangDescriptor[]): Array<{ rel: 'alternate'; hrefLang: string; href: string }> {
    const locales = overrides?.length ? overrides : SUPPORTED_LANGUAGES.map((locale) => ({ locale }));

    return locales.map(({ locale, path }) => ({
        rel: 'alternate' as const,
        hrefLang: locale,
        href: buildCanonicalUrl(path ?? `/${locale}${pathname === '/' ? '' : pathname}`),
    }));
}
