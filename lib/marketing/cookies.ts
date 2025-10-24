const sanitizeCookieValue = (value: string | null | undefined): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const escapeCookieName = (name: string): string => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const readMarketingCookie = (name: string): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const pattern = new RegExp(`(?:^|;\\s*)${escapeCookieName(name)}=([^;]*)`);
    const match = document.cookie.match(pattern);

    if (!match) {
        return null;
    }

    const rawValue = match[1];

    try {
        return sanitizeCookieValue(decodeURIComponent(rawValue));
    } catch (error) {
        return sanitizeCookieValue(rawValue);
    }
};

export type TrackingCookieSnapshot = {
    source: string | null;
    source_name: string | null;
    source_id: string | null;
    campaign_id: string | null;
    ttclid: string | null;
};

export const readTrackingCookieSnapshot = (): TrackingCookieSnapshot | null => {
    const sourceName = readMarketingCookie('dacars_source_name');
    const source = readMarketingCookie('dacars_source');
    const sourceId = readMarketingCookie('dacars_source_id');
    const campaignId = readMarketingCookie('dacars_campaign_id');
    const ttclid = readMarketingCookie('dacars_ttclid');

    if (!sourceName && !source && !sourceId && !campaignId && !ttclid) {
        return null;
    }

    return {
        source: sourceName ?? source ?? null,
        source_name: sourceName ?? null,
        source_id: sourceId ?? null,
        campaign_id: campaignId ?? null,
        ttclid: ttclid ?? null,
    };
};
