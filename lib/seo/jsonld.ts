import {
    DEFAULT_OG_IMAGE,
    ORG_LOGO_URL,
    ORG_SAME_AS,
    SITE_NAME,
    SITE_URL,
} from "@/lib/config";
import { canonical } from "@/lib/seo/url";

export type JsonLd = Record<string, unknown>;

const ensureAbsolute = (value: string | undefined): string | undefined => {
    if (!value) {
        return undefined;
    }

    try {
        return new URL(value, SITE_URL).toString();
    } catch {
        return value;
    }
};

export type OrganizationJsonLd = {
    "@context": "https://schema.org";
    "@type": "Organization";
    name: string;
    url: string;
    logo: string;
    sameAs?: readonly string[];
    contactPoint?: JsonLd[];
    description?: string;
};

export const organization = (overrides: Partial<OrganizationJsonLd> = {}): OrganizationJsonLd => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: ORG_LOGO_URL,
    sameAs: [...ORG_SAME_AS],
    ...overrides,
});

export type WebsiteJsonLd = {
    "@context": "https://schema.org";
    "@type": "WebSite";
    name: string;
    url: string;
    description?: string;
    publisher?: JsonLd;
};

export const website = (overrides: Partial<WebsiteJsonLd> = {}): WebsiteJsonLd => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: ORG_LOGO_URL,
    },
    ...overrides,
});

export type BreadcrumbItem = {
    name: string;
    url: string;
};

export type BreadcrumbJsonLd = {
    "@context": "https://schema.org";
    "@type": "BreadcrumbList";
    itemListElement: JsonLd[];
};

export const breadcrumb = (items: BreadcrumbItem[]): BreadcrumbJsonLd => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: ensureAbsolute(item.url) ?? item.url,
    })),
});

export type ItemListElementInput = {
    name: string;
    url: string;
    description?: string;
    image?: string;
    brand?: string;
    schemaType?: "Product" | "Service" | "Vehicle" | "Car" | "Article";
};

export type ItemListJsonLd = {
    "@type": "ItemList";
    itemListElement: JsonLd[];
};

export const itemList = (items: ItemListElementInput[]): ItemListJsonLd => ({
    "@type": "ItemList",
    itemListElement: items.map((entry, index) => {
        const item: JsonLd = {
            "@type": entry.schemaType ?? "Product",
            name: entry.name,
            url: ensureAbsolute(entry.url) ?? entry.url,
        };

        if (entry.description) {
            item.description = entry.description;
        }

        if (entry.image) {
            item.image = ensureAbsolute(entry.image);
        }

        if (entry.brand) {
            item.brand = {
                "@type": "Brand",
                name: entry.brand,
            };
        }

        return {
            "@type": "ListItem",
            position: index + 1,
            item,
        };
    }),
});

export type CollectionPageInput = {
    name: string;
    url: string;
    description?: string;
    items: ItemListElementInput[] | ItemListJsonLd;
};

export const collectionPage = (input: CollectionPageInput): JsonLd => {
    const mainEntity = Array.isArray(input.items) ? itemList(input.items) : input.items;

    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: input.name,
        description: input.description,
        url: ensureAbsolute(input.url) ?? input.url,
        mainEntity,
    };
};

export type BlogJsonLd = {
    "@context": "https://schema.org";
    "@type": "Blog";
    name: string;
    url: string;
    description?: string;
};

export const blog = (overrides: Partial<BlogJsonLd> = {}): BlogJsonLd => ({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    url: canonical("/blog"),
    ...overrides,
});

export type BlogPostingInput = {
    slug: string;
    title: string;
    description: string;
    image?: string;
    author: {
        name: string;
        url?: string;
        type?: "Person" | "Organization";
    };
    datePublished: string;
    dateModified?: string;
    keywords?: string[];
};

export const blogPosting = (input: BlogPostingInput): JsonLd => {
    const canonicalUrl = canonical(`/blog/${input.slug}`);

    const publisher: JsonLd = {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: ORG_LOGO_URL,
    };

    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: input.title,
        description: input.description,
        image: ensureAbsolute(input.image) ?? DEFAULT_OG_IMAGE,
        author: {
            "@type": input.author.type ?? "Person",
            name: input.author.name,
            url: input.author.url ?? undefined,
        },
        datePublished: input.datePublished,
        dateModified: input.dateModified ?? input.datePublished,
        mainEntityOfPage: canonicalUrl,
        url: canonicalUrl,
        publisher,
        keywords: input.keywords && input.keywords.length > 0 ? input.keywords : undefined,
    };
};

export type ContactPageInput = {
    name: string;
    description?: string;
    url: string;
    contactPoint: Array<{
        telephone: string;
        contactType: string;
        areaServed?: string | string[];
        availableLanguage?: string[];
        email?: string;
    }>;
};

export const contactPage = (input: ContactPageInput): JsonLd => ({
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: input.name,
    description: input.description,
    url: ensureAbsolute(input.url) ?? input.url,
    contactPoint: input.contactPoint.map((point) => ({
        "@type": "ContactPoint",
        telephone: point.telephone,
        contactType: point.contactType,
        areaServed: point.areaServed,
        availableLanguage: point.availableLanguage,
        email: point.email,
    })),
});

export type OfferInput = {
    name: string;
    url: string;
    priceCurrency: string;
    price: string | number;
    validFrom?: string;
    validThrough?: string;
    description?: string;
    availability?: string;
    itemOffered?: {
        name: string;
        url?: string;
        type?: string;
    };
};

export const offer = (input: OfferInput): JsonLd => {
    const offerData: JsonLd = {
        "@type": "Offer",
        name: input.name,
        priceCurrency: input.priceCurrency,
        price: input.price,
        url: ensureAbsolute(input.url) ?? input.url,
    };

    if (input.description) {
        offerData.description = input.description;
    }

    if (input.validFrom) {
        offerData.validFrom = input.validFrom;
    }

    if (input.validThrough) {
        offerData.validThrough = input.validThrough;
    }

    if (input.availability) {
        offerData.availability = input.availability;
    }

    if (input.itemOffered) {
        offerData.itemOffered = {
            "@type": input.itemOffered.type ?? "Service",
            name: input.itemOffered.name,
            url: ensureAbsolute(input.itemOffered.url) ?? input.itemOffered.url,
        };
    }

    return offerData;
};

export type OfferCatalogInput = {
    name: string;
    description?: string;
    url: string;
    offers: OfferInput[];
};

export const offerCatalog = (input: OfferCatalogInput): JsonLd => ({
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: input.name,
    description: input.description,
    url: ensureAbsolute(input.url) ?? input.url,
    itemListElement: input.offers.map((entry, index) => ({
        position: index + 1,
        ...offer(entry),
    })),
});

export const blogJsonLd = blog;

// Exporturi compatibile cu implementările anterioare.
export const buildOrganizationJsonLd = (overrides: Partial<JsonLd> = {}): JsonLd => ({
    ...organization(),
    ...overrides,
});

export const buildWebsiteJsonLd = (overrides: Partial<JsonLd> = {}): JsonLd => ({
    ...website(),
    ...overrides,
});

export const buildBreadcrumbJsonLd = (items: BreadcrumbItem[]): JsonLd | null => {
    if (!items || items.length === 0) {
        return null;
    }

    return breadcrumb(items);
};

export type FaqEntry = {
    question: string;
    answer: string;
};

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

export const buildArticleJsonLd = (input: ArticleJsonLdInput): JsonLd =>
    blogPosting({
        slug: input.slug,
        title: input.title,
        description: input.description,
        image: input.image,
        author: {
            name: input.author.name,
            type: input.author.type,
        },
        datePublished: input.publishedAt,
        dateModified: input.updatedAt,
    });
