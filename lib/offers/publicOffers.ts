import { unstable_cache } from "next/cache";

import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { Offer } from "@/types/offer";

const FEATURED_OFFERS_PARAMS = {
    audience: "public" as const,
    status: "published" as const,
    limit: 4 as const,
    sort: "-starts_at,-created_at" as const,
};

const FEATURED_OFFERS_CACHE_TAG = "public-featured-offers" as const;
const FEATURED_OFFERS_REVALIDATE_SECONDS = 600;

const fetchFeaturedOffersInternal = async (locale: Locale = DEFAULT_LOCALE): Promise<Offer[]> => {
    const requestedLocale = locale ?? DEFAULT_LOCALE;

    try {
        const response = await apiClient.getOffers({
            ...FEATURED_OFFERS_PARAMS,
            language: requestedLocale,
        });
        const offers = extractList<Offer>(response);
        if (offers.length > 0) {
            return offers;
        }
    } catch (error) {
        console.error("Nu am putut încărca ofertele pentru locale-ul solicitat", error);
    }

    if (requestedLocale === DEFAULT_LOCALE) {
        return [];
    }

    try {
        const fallbackResponse = await apiClient.getOffers(FEATURED_OFFERS_PARAMS);
        return extractList<Offer>(fallbackResponse);
    } catch (error) {
        console.error("Nu am putut încărca ofertele publice din API", error);
        return [];
    }
};

export const loadFeaturedOffers = unstable_cache(
    fetchFeaturedOffersInternal,
    ["public-featured-offers"],
    {
        tags: [FEATURED_OFFERS_CACHE_TAG],
        revalidate: FEATURED_OFFERS_REVALIDATE_SECONDS,
    },
);

export type { Offer };
