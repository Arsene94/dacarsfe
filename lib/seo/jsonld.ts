import { SITE_URL } from "@/lib/config";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import { buildCanonicalUrl } from "@/lib/seo/url";

export type JsonLd = Record<string, unknown>;

/**
 * Creează structura JSON-LD pentru organizația DaCars.
 */
export const buildOrganizationJsonLd = (overrides: Partial<JsonLd> = {}): JsonLd => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteMetadata.siteName,
    url: SITE_URL,
    logo: absoluteUrl(siteMetadata.defaultSocialImage.src),
    sameAs: siteMetadata.socialProfiles,
    contactPoint: [
        {
            "@type": "ContactPoint",
            contactType: "customer support",
            telephone: siteMetadata.contact.phone,
            email: siteMetadata.contact.email,
            areaServed: "RO",
            availableLanguage: ["ro", "en"],
        },
    ],
    address: {
        "@type": "PostalAddress",
        streetAddress: siteMetadata.address.street,
        addressLocality: siteMetadata.address.locality,
        addressRegion: siteMetadata.address.region,
        postalCode: siteMetadata.address.postalCode,
        addressCountry: siteMetadata.address.country,
    },
    ...overrides,
});

/**
 * Creează structura JSON-LD pentru website.
 */
export const buildWebsiteJsonLd = (overrides: Partial<JsonLd> = {}): JsonLd => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetadata.siteName,
    url: SITE_URL,
    description: siteMetadata.description,
    potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/cauta?query={search_term_string}`,
        "query-input": "required name=search_term_string",
    },
    ...overrides,
});

export type BreadcrumbItem = {
    name: string;
    url: string;
};

/**
 * Generează JSON-LD pentru breadcrumbs.
 */
export const buildBreadcrumbJsonLd = (items: BreadcrumbItem[]): JsonLd | null => {
    if (!items || items.length === 0) {
        return null;
    }

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
};

export type FaqEntry = {
    question: string;
    answer: string;
};

/**
 * Creează JSON-LD pentru pagini FAQ.
 */
export const buildFaqJsonLd = (entries: FaqEntry[]): JsonLd | null => {
    if (!entries || entries.length === 0) {
        return null;
    }

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: entries.map((entry) => ({
            "@type": "Question",
            name: entry.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: entry.answer,
            },
        })),
    };
};

export type ArticleJsonLdInput = {
    title: string;
    description: string;
    slug: string;
    publishedAt: string;
    updatedAt?: string;
    author: {
        name: string;
        type?: "Person" | "Organization";
    };
    image?: string;
};

/**
 * Creează JSON-LD pentru articole de blog.
 */
export const buildArticleJsonLd = (input: ArticleJsonLdInput): JsonLd => ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    dateModified: input.updatedAt ?? input.publishedAt,
    author: {
        "@type": input.author.type ?? "Person",
        name: input.author.name,
    },
    publisher: {
        "@type": "Organization",
        name: siteMetadata.siteName,
        logo: {
            "@type": "ImageObject",
            url: absoluteUrl(siteMetadata.defaultSocialImage.src),
        },
    },
    mainEntityOfPage: buildCanonicalUrl(`/blog/${input.slug}`),
    url: buildCanonicalUrl(`/blog/${input.slug}`),
    image: input.image ? absoluteUrl(input.image) : undefined,
});
