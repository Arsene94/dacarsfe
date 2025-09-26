import type { Metadata } from 'next';
import { Fragment } from 'react';

import { SITE_LOCALE, SITE_NAME, SITE_TWITTER } from '@/lib/config';
import { canonical, hreflangLinks } from '@/lib/seo/url';

export type SEOProps = {
    title: string;
    description: string;
    path?: string;
    openGraph?: Partial<Metadata['openGraph']>;
    twitter?: Partial<NonNullable<Metadata['twitter']>>;
    jsonLd?: Array<Record<string, unknown>> | Record<string, unknown>;
    hreflangLocales?: string[];
    links?: Array<{ rel: string; href: string; hrefLang?: string }>;
};

export function SEO({
    title,
    description,
    path = '/',
    openGraph,
    twitter,
    jsonLd,
    hreflangLocales,
    links,
}: SEOProps) {
    const canonicalUrl = canonical(path);
    const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
    const hreflangEntries = hreflangLocales?.length ? hreflangLinks(hreflangLocales, path) : [];
    const extraLinks = [...(links ?? []), ...hreflangEntries];

    const og = {
        title,
        description,
        url: canonicalUrl,
        siteName: SITE_NAME,
        locale: SITE_LOCALE,
        type: 'website',
        ...openGraph,
    } satisfies Partial<Metadata['openGraph']>;

    const twitterMeta = {
        card: 'summary_large_image',
        site: SITE_TWITTER,
        title,
        description,
        ...twitter,
    } satisfies Partial<NonNullable<Metadata['twitter']>>;

    return (
        <Fragment>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {extraLinks.map((link, index) => (
                <link
                    key={`${link.rel}-${link.hrefLang ?? index}-${link.href}`}
                    rel={link.rel}
                    href={link.href}
                    {...(link.hrefLang ? { hrefLang: link.hrefLang } : {})}
                />
            ))}

            <meta property="og:title" content={og.title ?? title} />
            <meta property="og:description" content={og.description ?? description} />
            <meta property="og:type" content={og.type ?? 'website'} />
            <meta property="og:url" content={og.url ?? canonicalUrl} />
            {og.siteName ? <meta property="og:site_name" content={og.siteName} /> : null}
            {og.locale ? <meta property="og:locale" content={og.locale} /> : null}
            {og.images?.map((image, index) => (
                <meta
                    key={`og-image-${index}`}
                    property="og:image"
                    content={typeof image === 'string' ? image : image.url}
                />
            ))}

            <meta name="twitter:card" content={twitterMeta.card ?? 'summary_large_image'} />
            {twitterMeta.site ? <meta name="twitter:site" content={twitterMeta.site} /> : null}
            <meta name="twitter:title" content={twitterMeta.title ?? title} />
            <meta name="twitter:description" content={twitterMeta.description ?? description} />
            {twitterMeta.images?.map((image, index) => (
                <meta
                    key={`twitter-image-${index}`}
                    name="twitter:image"
                    content={typeof image === 'string' ? image : image.url}
                />
            ))}

            {jsonLdArray.map((schema, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}
        </Fragment>
    );
}
