"use client";

import Head from "next/head";
import { useMemo } from "react";
import {
    SITE_LOCALE,
    SITE_NAME,
    SITE_TWITTER,
} from "@/lib/config";
import { canonical, hreflangLinks } from "@/lib/seo/url";
import { buildMetadata, resolveOgImage, type BuildMetadataInput } from "@/lib/seo/metadata";

export type SEOProps = {
    title: string;
    description: string;
    path: string;
    ogImage?: string;
    noIndex?: boolean;
    hreflangLocales?: string[];
};

const robotsValue = (noIndex: boolean): string => (noIndex ? "noindex, nofollow" : "index, follow");

const SEO = ({ title, description, path, ogImage, noIndex = false, hreflangLocales }: SEOProps) => {
    const canonicalUrl = useMemo(() => canonical(path), [path]);
    const alternates = useMemo(
        () => hreflangLinks(path, hreflangLocales ?? undefined),
        [hreflangLocales, path],
    );
    const imageUrl = useMemo(() => resolveOgImage(ogImage), [ogImage]);

    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robotsValue(noIndex)} />
            <link rel="canonical" href={canonicalUrl} />
            {alternates.map((alternate) => (
                <link key={alternate.hrefLang} rel="alternate" hrefLang={alternate.hrefLang} href={alternate.href} />
            ))}

            <meta property="og:type" content="website" />
            <meta property="og:locale" content={SITE_LOCALE} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:image" content={imageUrl} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={SITE_TWITTER} />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrl} />
        </Head>
    );
};

export type { BuildMetadataInput };
export { buildMetadata };
export default SEO;
