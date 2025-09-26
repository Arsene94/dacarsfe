"use client";

import Head from "next/head";
import { useMemo } from "react";
import type { JsonLd } from "@/lib/seo/jsonld";
import { buildCanonicalUrl, buildHreflangAlternates } from "@/lib/seo/url";
import { siteMetadata } from "@/lib/seo/siteMetadata";

export type SEOProps = {
    title: string;
    description: string;
    path?: string;
    image?: { src: string; alt?: string };
    noIndex?: boolean;
    jsonLd?: JsonLd[];
    hreflangs?: readonly string[];
};

/**
 * Componentă de SEO care adaugă tag-urile critice în <head> pentru motoare de căutare și roboți AI.
 */
const SEO = ({ title, description, path, image, noIndex = false, jsonLd = [], hreflangs }: SEOProps) => {
    const canonicalUrl = useMemo(() => buildCanonicalUrl(path), [path]);
    const alternates = useMemo(() => buildHreflangAlternates(path, hreflangs), [hreflangs, path]);
    const robotsValue = noIndex ? "noindex, nofollow" : "index, follow";
    const socialImage = image?.src ?? siteMetadata.defaultSocialImage.src;
    const socialAlt = image?.alt ?? siteMetadata.defaultSocialImage.alt;

    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robotsValue} />
            <link rel="canonical" href={canonicalUrl} />
            {alternates.map((alternate) => (
                <link key={alternate.hrefLang} rel="alternate" hrefLang={alternate.hrefLang} href={alternate.href} />
            ))}

            <meta property="og:type" content="website" />
            <meta property="og:locale" content={siteMetadata.locale} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:site_name" content={siteMetadata.siteName} />
            <meta property="og:image" content={socialImage} />
            <meta property="og:image:alt" content={socialAlt} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={socialImage} />

            {jsonLd.map((schema, index) => {
                if (!schema) {
                    return null;
                }
                try {
                    const payload = JSON.stringify(schema);
                    return (
                        <script
                            key={`jsonld-${index}`}
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{ __html: payload }}
                            suppressHydrationWarning
                        />
                    );
                } catch {
                    return null;
                }
            })}
        </Head>
    );
};

export default SEO;
