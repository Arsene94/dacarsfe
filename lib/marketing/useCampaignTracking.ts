"use client";

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import type { CampaignTrackingData } from '@/lib/marketing/campaignTracking';

const normalize = (value: string | null): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const detectReferrerFallback = (referrer: string | null): Pick<CampaignTrackingData, 'source' | 'medium'> => {
    if (!referrer) {
        return { source: 'direct', medium: 'none' };
    }

    if (referrer.includes('google.')) {
        return { source: 'google', medium: 'organic' };
    }

    try {
        const url = new URL(referrer);
        return { source: url.hostname, medium: 'referral' };
    } catch (error) {
        return { source: referrer, medium: 'referral' };
    }
};

const buildCampaignData = (
    params: URLSearchParams,
    referrer: string | null,
): CampaignTrackingData => {
    const source = normalize(params.get('utm_source'));
    const medium = normalize(params.get('utm_medium'));
    const campaignId = normalize(params.get('utm_id')) ?? normalize(params.get('campaign_id'));
    const adsetId = normalize(params.get('adset_id'));
    const adId = normalize(params.get('ad_id'));
    const fbclid = normalize(params.get('fbclid'));
    const ttclid = normalize(params.get('ttclid'));
    const sanitizedReferrer = normalize(referrer);

    const base: CampaignTrackingData = {
        source,
        medium,
        campaign_id: campaignId,
        adset_id: adsetId,
        ad_id: adId,
        fbclid,
        ttclid,
        referrer: sanitizedReferrer,
    };

    if (!base.source) {
        const fallback = detectReferrerFallback(sanitizedReferrer);
        base.source = fallback.source;
        base.medium = fallback.medium;
    }

    return base;
};

const useCampaignTracking = () => {
    const params = useSearchParams();

    const serializedParams = params?.toString() ?? '';
    const paramsSnapshot = useMemo(
        () => new URLSearchParams(serializedParams),
        [serializedParams],
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const referrer = typeof document !== 'undefined' ? document.referrer || null : null;
        const campaignData = buildCampaignData(paramsSnapshot, referrer);

        void import('@/lib/marketing/campaignTracking')
            .then((module) => {
                if (typeof module.storeCampaignTrackingData === 'function') {
                    module.storeCampaignTrackingData(campaignData);
                }
            })
            .catch((error) => {
                console.warn('Nu am putut salva datele campaniei dinamic', error);
            });
    }, [paramsSnapshot]);
};

export default useCampaignTracking;
