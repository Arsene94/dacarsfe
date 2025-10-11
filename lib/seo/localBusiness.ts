import { SITE_URL } from "@/lib/config";
import { ensureAbsoluteUrl } from "@/lib/seo/structuredData";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import type { JsonLd } from "@/lib/seo/jsonld";
import type { Offer } from "@/types/offer";

type OfferSummary = {
    id: number;
    title: string;
    description?: string | null;
    primary_cta_url?: string | null;
    slug?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
};

type ReviewSummary = {
    author: string;
    body: string;
    rating: number;
    datePublished: string;
    profileUrl?: string;
};

type AggregateRatingInput = {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
};

const OPENING_HOURS_SPECIFICATION = [{
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ],
    opens: "00:00",
    closes: "23:59",
}];

const FALLBACK_OFFERS: JsonLd[] = [
    {
        "@type": "Offer",
        name: "Reducere nuntă 10%",
        description:
            "Prezinți invitația de nuntă la preluarea mașinii și primești 10% reducere din valoarea totală a rezervării.",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: ensureAbsoluteUrl("/offers/reducere-nunta", SITE_URL),
    },
    {
        "@type": "Offer",
        name: "Adu un prieten: reducere cumulată 20%",
        description:
            "Închiriază simultan cu un prieten și primiți împreună o reducere cumulată de 20% aplicată automat la checkout.",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: ensureAbsoluteUrl("/offers/adu-un-prieten", SITE_URL),
    },
];

const formatOffer = (offer: OfferSummary): JsonLd => {
    const url = offer.primary_cta_url
        ? ensureAbsoluteUrl(offer.primary_cta_url, SITE_URL)
        : ensureAbsoluteUrl(`/offers/${offer.slug ?? offer.id}`, SITE_URL);

    const mapped: JsonLd = {
        "@type": "Offer",
        name: offer.title,
        description: offer.description ?? undefined,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url,
    };

    if (offer.starts_at) {
        mapped.validFrom = offer.starts_at;
    }

    if (offer.ends_at) {
        mapped.validThrough = offer.ends_at;
    }

    return mapped;
};

const formatReview = (review: ReviewSummary): JsonLd => ({
    "@type": "Review",
    author: {
        "@type": "Person",
        name: review.author,
        ...(review.profileUrl ? { sameAs: review.profileUrl } : {}),
    },
    datePublished: review.datePublished,
    reviewBody: review.body,
    reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
    },
});

export const buildLocalBusinessStructuredData = (
    offers: Offer[],
    reviews: ReviewSummary[],
    aggregateRating?: AggregateRatingInput,
): JsonLd => {
    const businessImage = ensureAbsoluteUrl(siteMetadata.defaultSocialImage.src, SITE_URL);

    const mappedOffers = offers
        .slice(0, 3)
        .map((offer) =>
            formatOffer({
                id: offer.id,
                title: offer.title,
                description: offer.description,
                primary_cta_url: offer.primary_cta_url,
                slug: offer.slug,
                starts_at: offer.starts_at,
                ends_at: offer.ends_at,
            }),
        )
        .filter((entry) => Boolean(entry && Object.keys(entry).length > 0));

    const data: JsonLd = {
        "@context": "https://schema.org",
        "@type": "CarRental",
        name: siteMetadata.siteName,
        url: siteMetadata.siteUrl,
        image: businessImage,
        telephone: siteMetadata.contact.phone,
        email: siteMetadata.contact.email,
        priceRange: "€€",
        address: {
            "@type": "PostalAddress",
            streetAddress: `${siteMetadata.address.street}`,
            addressLocality: siteMetadata.address.locality,
            addressRegion: siteMetadata.address.region,
            postalCode: siteMetadata.address.postalCode,
            addressCountry: siteMetadata.address.country,
        },
        geo: {
            "@type": "GeoCoordinates",
            latitude: 44.558968,
            longitude: 26.072314,
        },
        areaServed: [
            "București",
            "Otopeni",
            "Aeroport Henri Coandă",
            "România",
            "UK",
            "Spania",
            "Italia",
        ],
        openingHoursSpecification: OPENING_HOURS_SPECIFICATION,
        sameAs: siteMetadata.socialProfiles,
        review: reviews.slice(0, 3).map(formatReview),
    };

    const offersToExpose = [...FALLBACK_OFFERS, ...mappedOffers];

    if (offersToExpose.length > 0) {
        data.makesOffer = offersToExpose.slice(0, 5);
    }

    if (aggregateRating) {
        data.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: aggregateRating.ratingValue,
            reviewCount: aggregateRating.reviewCount,
            bestRating: aggregateRating.bestRating ?? 5,
            worstRating: aggregateRating.worstRating ?? 1,
        };
    }

    return data;
};
