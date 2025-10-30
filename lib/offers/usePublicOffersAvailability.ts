"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";

type AvailabilityState = {
    hasOffers: boolean | null;
    isLoading: boolean;
};

const AVAILABILITY_REQUEST_PARAMS = {
    audience: "public" as const,
    status: "published" as const,
    limit: 1 as const,
    sort: "-starts_at,-created_at" as const,
};

let cachedHasOffers: boolean | null = null;
let ongoingAvailabilityRequest: Promise<boolean> | null = null;

const readAvailability = async (): Promise<boolean> => {
    const response = await apiClient.getOffers(AVAILABILITY_REQUEST_PARAMS);
    const offers = extractList(response);
    return offers.length > 0;
};

const trackAvailabilityRequest = (): Promise<boolean> => {
    if (!ongoingAvailabilityRequest) {
        ongoingAvailabilityRequest = readAvailability()
            .then((hasOffers) => {
                cachedHasOffers = hasOffers;
                return hasOffers;
            })
            .catch((error) => {
                console.error("Nu am putut verifica disponibilitatea ofertelor publice", error);
                cachedHasOffers = true;
                return true;
            })
            .finally(() => {
                ongoingAvailabilityRequest = null;
            });
    }

    return ongoingAvailabilityRequest;
};

export const usePublicOffersAvailability = (): AvailabilityState => {
    const [hasOffers, setHasOffers] = useState<boolean | null>(cachedHasOffers);
    const [isLoading, setIsLoading] = useState<boolean>(cachedHasOffers === null);

    useEffect(() => {
        let isActive = true;

        if (cachedHasOffers !== null) {
            setHasOffers(cachedHasOffers);
            setIsLoading(false);
            return () => {
                isActive = false;
            };
        }

        setIsLoading(true);

        trackAvailabilityRequest()
            .then((result) => {
                if (isActive) {
                    setHasOffers(result);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (isActive) {
                    setHasOffers(true);
                    setIsLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    return { hasOffers, isLoading };
};

