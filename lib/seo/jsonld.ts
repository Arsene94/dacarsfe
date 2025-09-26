import { ORG_LOGO_URL, SITE_NAME, SITE_URL } from '@/lib/config';
import { absolute, canonical } from '@/lib/seo/url';

export type JsonLd<T extends string> = {
    '@context': 'https://schema.org';
    '@type': T;
} & Record<string, unknown>;

export type OrganizationJsonLd = JsonLd<'Organization'>;
export type WebsiteJsonLd = JsonLd<'WebSite'>;
export type BreadcrumbJsonLd = JsonLd<'BreadcrumbList'>;
export type CollectionPageJsonLd = JsonLd<'CollectionPage'>;
export type BlogJsonLd = JsonLd<'Blog'>;
export type BlogPostingJsonLd = JsonLd<'BlogPosting'>;
export type ContactPageJsonLd = JsonLd<'ContactPage'>;
export type OfferCatalogJsonLd = JsonLd<'OfferCatalog'>;
export type OfferJsonLd = JsonLd<'Offer'>;
export type AggregateOfferJsonLd = JsonLd<'AggregateOffer'>;
export type ItemListJsonLd = JsonLd<'ItemList'>;
export type FaqPageJsonLd = JsonLd<'FAQPage'>;

export function organizationJsonLd(options?: {
    name?: string;
    url?: string;
    logo?: string;
    sameAs?: string[];
    description?: string;
    contactPoints?: Array<{
        contactType: string;
        telephone?: string;
        email?: string;
        areaServed?: string;
        availableLanguage?: string[];
    }>;
}): OrganizationJsonLd {
    const {
        name = SITE_NAME,
        url = SITE_URL,
        logo = ORG_LOGO_URL,
        sameAs = [],
        description,
        contactPoints,
    } = options ?? {};

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name,
        url,
        description,
        logo,
        sameAs,
        contactPoint: contactPoints?.map((point) => ({
            '@type': 'ContactPoint',
            contactType: point.contactType,
            telephone: point.telephone,
            email: point.email,
            areaServed: point.areaServed,
            availableLanguage: point.availableLanguage,
        })),
    };
}

export function websiteJsonLd(options?: {
    name?: string;
    description?: string;
    searchPath?: string;
}): WebsiteJsonLd {
    const { name = SITE_NAME, description, searchPath } = options ?? {};

    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        url: SITE_URL,
        name,
        description,
        potentialAction: searchPath
            ? {
                  '@type': 'SearchAction',
                  target: `${SITE_URL}${searchPath}?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
              }
            : undefined,
    };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): BreadcrumbJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: canonical(item.path),
        })),
    };
}

export function itemListJsonLd(items: Array<{ name: string; url: string; image?: string }>): ItemListJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: absolute(item.url),
            image: item.image ? absolute(item.image) : undefined,
        })),
    };
}

export function collectionPageJsonLd(options: {
    name: string;
    description: string;
    path: string;
    items: Array<{ name: string; url: string; image?: string; brand?: string; offers?: OfferJsonLd | AggregateOfferJsonLd }>;
}): CollectionPageJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: options.name,
        description: options.description,
        url: canonical(options.path),
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: options.items.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                    '@type': 'Product',
                    name: item.name,
                    brand: item.brand,
                    image: item.image ? absolute(item.image) : undefined,
                    url: absolute(item.url),
                    offers: item.offers,
                },
            })),
        },
    };
}

export function blogJsonLd(options: {
    name: string;
    description: string;
    path: string;
    posts: BlogPostingJsonLd[];
}): BlogJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: options.name,
        description: options.description,
        url: canonical(options.path),
        blogPost: options.posts,
    };
}

export function blogPostingJsonLd(options: {
    title: string;
    description: string;
    path: string;
    image?: string;
    author: string;
    keywords?: string[];
    datePublished: string;
    dateModified?: string;
}): BlogPostingJsonLd {
    const canonicalUrl = canonical(options.path);

    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: options.title,
        description: options.description,
        image: options.image ? absolute(options.image) : undefined,
        author: {
            '@type': 'Person',
            name: options.author,
        },
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        keywords: options.keywords,
        datePublished: options.datePublished,
        dateModified: options.dateModified ?? options.datePublished,
    };
}

export function contactPageJsonLd(options: {
    name: string;
    description: string;
    path: string;
    contactPoints: Array<{
        contactType: string;
        telephone?: string;
        email?: string;
        areaServed?: string;
        availableLanguage?: string[];
    }>;
}): ContactPageJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: options.name,
        description: options.description,
        url: canonical(options.path),
        contactPoint: options.contactPoints.map((point) => ({
            '@type': 'ContactPoint',
            contactType: point.contactType,
            telephone: point.telephone,
            email: point.email,
            areaServed: point.areaServed,
            availableLanguage: point.availableLanguage,
        })),
    };
}

export function offerJsonLd(options: {
    name: string;
    price: number;
    priceCurrency: string;
    url: string;
    validFrom: string;
    validThrough?: string;
    category?: string;
    availability?: string;
    itemCondition?: string;
}): OfferJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'Offer',
        name: options.name,
        price: options.price,
        priceCurrency: options.priceCurrency,
        url: absolute(options.url),
        validFrom: options.validFrom,
        validThrough: options.validThrough,
        category: options.category,
        availability: options.availability,
        itemCondition: options.itemCondition,
    };
}

export function aggregateOfferJsonLd(options: {
    lowPrice: number;
    highPrice: number;
    priceCurrency: string;
    offerCount: number;
}): AggregateOfferJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'AggregateOffer',
        lowPrice: options.lowPrice,
        highPrice: options.highPrice,
        priceCurrency: options.priceCurrency,
        offerCount: options.offerCount,
    };
}

export function offerCatalogJsonLd(options: {
    name: string;
    description: string;
    path: string;
    offers: Array<{
        name: string;
        url: string;
        image?: string;
        priceCurrency: string;
        price: number;
        validFrom: string;
        validThrough?: string;
        category?: string;
    }>;
}): OfferCatalogJsonLd {
    return {
        '@context': 'https://schema.org',
        '@type': 'OfferCatalog',
        name: options.name,
        description: options.description,
        url: canonical(options.path),
        itemListElement: options.offers.map((offer, index) => ({
            '@type': 'OfferCatalog',
            name: offer.name,
            position: index + 1,
            itemListElement: [
                offerJsonLd({
                    name: offer.name,
                    price: offer.price,
                    priceCurrency: offer.priceCurrency,
                    url: offer.url,
                    validFrom: offer.validFrom,
                    validThrough: offer.validThrough,
                    category: offer.category,
                }),
            ],
        })),
    };
}

export function faqPageJsonLd(entries: Array<{ question: string; answer: string }>): FaqPageJsonLd {
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
