import type { Metadata } from "next";
import {
    DEFAULT_OG_IMAGE,
    SITE_LOCALE,
    SITE_NAME,
    SITE_TWITTER,
    SITE_URL,
} from "@/lib/config";
import { canonical, hreflangLinks } from "@/lib/seo/url";

export type BuildMetadataInput = {
    title: string;
    description: string;
    path: string;
    ogImage?: string;
    noIndex?: boolean;
    hreflangLocales?: string[];
    keywords?: string[];
    openGraphTitle?: string;
    twitterTitle?: string;
};

export const resolveOgImage = (value: string | undefined): string => {
    const reference = value ?? DEFAULT_OG_IMAGE;
    try {
        return new URL(reference, SITE_URL).toString();
    } catch {
        return reference;
    }
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
}: BuildMetadataInput): Metadata => {
    const canonicalUrl = canonical(path);
    const alternates = hreflangLinks(path, hreflangLocales ?? undefined);
    const languages = alternates.reduce<Record<string, string>>((acc, entry) => {
        acc[entry.hrefLang] = entry.href;
        return acc;
    }, {});
    const imageUrl = resolveOgImage(ogImage);
    const computedKeywords = keywords && keywords.length > 0 ? [...keywords] : undefined;
    const ogTitle = openGraphTitle ?? title;
    const twitterCardTitle = twitterTitle ?? ogTitle;

    return {
        title,
        description,
        keywords: computedKeywords,
        alternates: {
            canonical: canonicalUrl,
            languages,
        },
        openGraph: {
            title: ogTitle,
            description,
            url: canonicalUrl,
            siteName: SITE_NAME,
            locale: SITE_LOCALE,
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
