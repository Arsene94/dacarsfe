import { SITE_URL } from '@/lib/config';
import { buildCanonicalUrl } from '@/lib/seo/url';

export type OrganizationJsonLdOptions = {
    name: string;
    logoPath: string;
    sameAs?: string[];
    description?: string;
};

export function buildOrganizationJsonLd(options: OrganizationJsonLdOptions) {
    const { name, logoPath, sameAs = [], description } = options;
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        url: SITE_URL,
        name,
        description,
        logo: buildCanonicalUrl(logoPath),
        sameAs,
    };
}

export type WebsiteJsonLdOptions = {
    name: string;
    searchUrl?: string;
};

export function buildWebsiteJsonLd(options: WebsiteJsonLdOptions) {
    const { name, searchUrl } = options;
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        url: SITE_URL,
        name,
        potentialAction: searchUrl
            ? {
                  '@type': 'SearchAction',
                  target: `${SITE_URL}${searchUrl}?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
              }
            : undefined,
    };
}

export type BreadcrumbItem = {
    name: string;
    path: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: buildCanonicalUrl(item.path),
        })),
    };
}

export type FAQEntry = {
    question: string;
    answer: string;
};

export function buildFaqJsonLd(entries: FAQEntry[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: entry.answer,
            },
        })),
    };
}

export type ArticleJsonLdOptions = {
    title: string;
    description: string;
    slug: string;
    publishedAt: string;
    updatedAt?: string;
    author: string;
    coverImage?: string;
};

export function buildArticleJsonLd(options: ArticleJsonLdOptions) {
    const { title, description, slug, publishedAt, updatedAt, author, coverImage } = options;
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        image: coverImage ? [buildCanonicalUrl(coverImage)] : undefined,
        datePublished: publishedAt,
        dateModified: updatedAt ?? publishedAt,
        author: {
            '@type': 'Person',
            name: author,
        },
        mainEntityOfPage: buildCanonicalUrl(`/blog/${slug}`),
    };
}
