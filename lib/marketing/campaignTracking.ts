import {
    readTrackingCookieSnapshot,
    type TrackingCookieSnapshot,
} from '@/lib/marketing/cookies';

export type CampaignTrackingData = {
    source: string | null;
    medium: string | null;
    campaign_id: string | null;
    adset_id: string | null;
    ad_id: string | null;
    fbclid: string | null;
    ttclid: string | null;
    referrer: string | null;
};

export const CAMPAIGN_TRACKING_STORAGE_KEY = 'campaignData' as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeString = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }
    return null;
};

const normalizeNullableString = (value: unknown): string | null => normalizeString(value);

export const storeCampaignTrackingData = (data: CampaignTrackingData) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(CAMPAIGN_TRACKING_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('Nu am putut salva datele campaniei în localStorage', error);
    }
};

export const getStoredCampaignTrackingData = (): CampaignTrackingData | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(CAMPAIGN_TRACKING_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!isRecord(parsed)) {
            return null;
        }

        return {
            source: normalizeString(parsed.source) ?? null,
            medium: normalizeNullableString(parsed.medium),
            campaign_id: normalizeNullableString(parsed.campaign_id),
            adset_id: normalizeNullableString(parsed.adset_id),
            ad_id: normalizeNullableString(parsed.ad_id),
            fbclid: normalizeNullableString(parsed.fbclid),
            ttclid: normalizeNullableString(parsed.ttclid),
            referrer: normalizeNullableString(parsed.referrer),
        };
    } catch (error) {
        console.warn('Nu am putut citi datele campaniei din localStorage', error);
        return null;
    }
};

export type TrackingCookies = TrackingCookieSnapshot;

export const readTrackingCookies = (): TrackingCookies | null => readTrackingCookieSnapshot();
