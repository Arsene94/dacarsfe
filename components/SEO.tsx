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
    const canonicalUrl = useMemo(() => (noIndex ? null : canonical(path)), [noIndex, path]);
    const alternates = useMemo(
        () => (noIndex ? [] : hreflangLinks(path, hreflangLocales ?? undefined)),
        [hreflangLocales, noIndex, path],
    );
    const imageUrl = useMemo(() => resolveOgImage(ogImage), [ogImage]);

    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robotsValue(noIndex)} />
            {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
            {alternates.map((alternate) => (
                <link key={alternate.hrefLang} rel="alternate" hrefLang={alternate.hrefLang} href={alternate.href} />
            ))}

            <meta property="og:type" content="website" />
            <meta property="og:locale" content={SITE_LOCALE} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
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
