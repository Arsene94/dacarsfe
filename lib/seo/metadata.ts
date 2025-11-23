import type { Metadata } from "next";
import {
    DEFAULT_OG_IMAGE,
    SITE_LOCALE,
    SITE_NAME,
    SITE_TWITTER,
    SITE_URL,
} from "@/lib/config";
import type { Locale } from "@/lib/i18n/config";
import { canonical, hreflangLinks, resolveLocalizedPathname } from "@/lib/seo/url";

export type BuildMetadataInput = {
    title: string;
    description: string;
    path: string;
    ogImage?: string;
    noIndex?: boolean;
    hreflangLocales?: readonly string[];
    keywords?: readonly string[];
    openGraphTitle?: string;
    twitterTitle?: string;
    locale?: Locale | string;
};

export const resolveOgImage = (value: string | undefined): string => {
    const reference = value ?? DEFAULT_OG_IMAGE;
    try {
        return new URL(reference, SITE_URL).toString();
    } catch {
        return reference;
    }
};

const OPEN_GRAPH_LOCALE_MAP: Record<string, string> = {
    ro: "ro_RO",
    en: "en_US",
    it: "it_IT",
    es: "es_ES",
    fr: "fr_FR",
    de: "de_DE",
};

export const resolveOpenGraphLocale = (locale?: Locale | string): string => {
    if (!locale) {
        return SITE_LOCALE;
    }

    const normalized = locale.toString().toLowerCase();
    if (OPEN_GRAPH_LOCALE_MAP[normalized]) {
        return OPEN_GRAPH_LOCALE_MAP[normalized];
    }

    const base = normalized.split(/[\-_]/)[0];
    if (base && OPEN_GRAPH_LOCALE_MAP[base]) {
        return OPEN_GRAPH_LOCALE_MAP[base];
    }

    return SITE_LOCALE;
};

export const buildMetadata = ({
    title,
    description,
    path,
    ogImage,
    noIndex = false,
    hreflangLocales,
    keywords,
    openGraphTitle,
    twitterTitle,
    locale,
}: BuildMetadataInput): Metadata => {
    const localizedPath = resolveLocalizedPathname(path, locale);
    const canonicalUrl = noIndex ? undefined : canonical(localizedPath);
    const alternateHreflangs = noIndex ? [] : hreflangLinks(localizedPath, hreflangLocales ?? undefined);
    const languages =
        alternateHreflangs.length > 0
            ? alternateHreflangs.reduce<Record<string, string>>((acc, entry) => {
                  acc[entry.hrefLang] = entry.href;
                  return acc;
              }, {})
            : undefined;
    const imageUrl = resolveOgImage(ogImage);
    const computedKeywords =
        keywords && keywords.length > 0 ? [...keywords] : undefined;
    const ogTitle = openGraphTitle ?? title;
    const twitterCardTitle = twitterTitle ?? ogTitle;

    return {
        title,
        description,
        keywords: computedKeywords,
        alternates: canonicalUrl
            ? {
                  canonical: canonicalUrl,
                  languages,
              }
            : undefined,
        openGraph: {
            title: ogTitle,
            description,
            url: canonicalUrl,
            siteName: SITE_NAME,
            locale: resolveOpenGraphLocale(locale),
            type: "website",
            images: [{ url: imageUrl }],
        },
        twitter: {
            card: "summary_large_image",
            site: SITE_TWITTER,
            title: twitterCardTitle,
            description,
            images: [imageUrl],
        },
        robots: noIndex
            ? {
                  index: false,
                  follow: false,
                  googleBot: {
                      index: false,
                      follow: false,
                  },
              }
            : undefined,
    };
};
