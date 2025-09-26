import type { Metadata } from 'next';
import { Fragment } from 'react';

import { buildHreflangLinks, buildCanonicalUrl } from '@/lib/seo/url';

export type SEOProps = {
    title: string;
    description: string;
    path?: string;
    openGraph?: Partial<Metadata['openGraph']>;
    twitter?: Partial<NonNullable<Metadata['twitter']>>;
    jsonLd?: Array<Record<string, unknown>> | Record<string, unknown>;
    hreflang?: boolean;
};

/**
 * Head component reutilizabil pentru paginile publice. Menține sincronizarea între metadata statică și tag-urile runtime.
 */
export function SEO({ title, description, path = '', openGraph, twitter, jsonLd, hreflang }: SEOProps) {
    const canonicalUrl = buildCanonicalUrl(path || '/');
    const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
    const hreflangLinks = hreflang ? buildHreflangLinks(path || '/') : [];

    const og = {
        title,
        description,
        url: canonicalUrl,
        ...openGraph,
    } satisfies Partial<Metadata['openGraph']>;

    const twitterMeta = {
        card: 'summary_large_image',
        title,
        description,
        ...twitter,
    } satisfies Partial<NonNullable<Metadata['twitter']>>;

    return (
        <Fragment>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {hreflangLinks.map((link) => (
                <link key={link.hrefLang} rel={link.rel} hrefLang={link.hrefLang} href={link.href} />
            ))}

            <meta property="og:title" content={og.title ?? title} />
            <meta property="og:description" content={og.description ?? description} />
            <meta property="og:type" content={(og.type as string) ?? 'website'} />
            <meta property="og:url" content={og.url ?? canonicalUrl} />
            {og.images?.length ? og.images.map((image, index) => (
                <meta key={index} property="og:image" content={typeof image === 'string' ? image : image.url} />
            )) : null}

            <meta name="twitter:card" content={twitterMeta.card ?? 'summary_large_image'} />
            <meta name="twitter:title" content={twitterMeta.title ?? title} />
            <meta name="twitter:description" content={twitterMeta.description ?? description} />
            {twitterMeta.images?.length ? twitterMeta.images.map((image, index) => (
                <meta key={index} name="twitter:image" content={typeof image === 'string' ? image : image.url} />
            )) : null}

            {jsonLdArray.map((schema, index) => (
                <script
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                    type="application/ld+json"
                    key={index}
                />
            ))}
        </Fragment>
    );
}
