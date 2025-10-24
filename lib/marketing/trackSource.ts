import { readMarketingCookie, readTrackingCookieSnapshot } from '@/lib/marketing/cookies';

export type TrackedSourceDetails = {
    source: string;
    medium?: string | null;
    campaign?: string | null;
    referrer?: string | null;
    capturedAt: string;
    lastSyncedAt?: string;
    sessionId?: string | null;
};

const SOURCE_KEY = 'dacars_source';
const SOURCE_DETAILS_KEY = 'dacars_source_details';
const SESSION_KEY = 'dacars_source_session_id';
const LEGACY_SESSION_KEY = 'session_id';
const SESSION_SIGNATURE_KEY = 'dacars_source_session_signature';

type SessionSignatureState = {
    signature: string;
    status: 'pending' | 'synced';
};

const sanitizeValue = (value?: string | null): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return null;
    }

    return trimmed;
};

const safeGetItem = (key: string): string | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return window.localStorage.getItem(key);
    } catch (error) {
        console.warn('Nu am putut citi elementul din localStorage', key, error);
        return null;
    }
};

const safeSetItem = (key: string, value: string) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(key, value);
    } catch (error) {
        console.warn('Nu am putut salva elementul în localStorage', key, error);
    }
};

const safeRemoveItem = (key: string) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.removeItem(key);
    } catch (error) {
        console.warn('Nu am putut elimina elementul din localStorage', key, error);
    }
};

const resolveCookieSource = (): string | null =>
    readMarketingCookie('dacars_source_name') ?? readMarketingCookie('dacars_source');

const readCookieDetails = (): TrackedSourceDetails | null => {
    const snapshot = readTrackingCookieSnapshot();
    if (!snapshot || !snapshot.source) {
        return null;
    }

    return {
        source: snapshot.source,
        medium: null,
        campaign: snapshot.campaign_id,
        referrer: null,
        capturedAt: new Date().toISOString(),
        sessionId: snapshot.source_id,
    } satisfies TrackedSourceDetails;
};

const parseStoredDetails = (raw: string | null): TrackedSourceDetails | null => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as TrackedSourceDetails;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        if (typeof parsed.source !== 'string' || parsed.source.trim().length === 0) {
            return null;
        }

        return parsed;
    } catch (error) {
        console.warn('Nu am putut interpreta detaliile sursei salvate', error);
        return null;
    }
};

const readSessionSignature = (): SessionSignatureState | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(SESSION_SIGNATURE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<SessionSignatureState>;
        if (
            parsed &&
            typeof parsed.signature === 'string' &&
            (parsed.status === 'pending' || parsed.status === 'synced')
        ) {
            return { signature: parsed.signature, status: parsed.status };
        }
    } catch (error) {
        console.warn('Nu am putut citi semnătura sursei din sessionStorage', error);
    }

    return null;
};

const storeSessionSignature = (signature: string, status: SessionSignatureState['status']) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const payload: SessionSignatureState = { signature, status };
        window.sessionStorage.setItem(SESSION_SIGNATURE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('Nu am putut salva semnătura sursei în sessionStorage', error);
    }
};

const buildSignature = (details: TrackedSourceDetails): string =>
    [details.source ?? '', details.medium ?? '', details.campaign ?? '', details.referrer ?? ''].join('|');

const normalizeHost = (value: string | null | undefined): string | null => {
    const sanitized = sanitizeValue(value);
    if (!sanitized) {
        return null;
    }

    return sanitized.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase();
};

const resolveReferrerDetails = (referrer: string | null): {
    source: string | null;
    medium: string | null;
    referrer: string | null;
} | null => {
    const sanitized = sanitizeValue(referrer);
    if (!sanitized) {
        return null;
    }

    try {
        const currentHost = typeof window !== 'undefined' ? normalizeHost(window.location.hostname) : null;
        const parsedUrl = new URL(sanitized);
        const refHost = normalizeHost(parsedUrl.hostname);

        if (currentHost && refHost && (refHost === currentHost || refHost.endsWith(`.${currentHost}`))) {
            return null;
        }

        const inferredSource = refHost ?? sanitizeValue(parsedUrl.hostname) ?? sanitized;
        return {
            source: inferredSource,
            medium: 'referral',
            referrer: sanitized,
        };
    } catch (error) {
        const host = normalizeHost(sanitized);
        if (!host) {
            return null;
        }

        return {
            source: host,
            medium: 'referral',
            referrer: sanitized,
        };
    }
};

const detectSourceDetails = (): TrackedSourceDetails | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const params = new URLSearchParams(window.location.search ?? '');
    const utmSource = sanitizeValue(params.get('utm_source'));
    const utmMedium = sanitizeValue(params.get('utm_medium'));
    const utmCampaign = sanitizeValue(params.get('utm_campaign'));
    const referrerInfo = typeof document !== 'undefined' ? resolveReferrerDetails(document.referrer) : null;

    const resolvedSource = utmSource ?? referrerInfo?.source ?? 'direct';
    const resolvedMedium = utmMedium ?? referrerInfo?.medium ?? (resolvedSource === 'direct' ? 'direct' : 'referral');
    const resolvedCampaign = utmCampaign ?? null;
    const resolvedReferrer = referrerInfo?.referrer ?? null;

    return {
        source: resolvedSource,
        medium: resolvedMedium,
        campaign: resolvedCampaign,
        referrer: resolvedReferrer,
        capturedAt: new Date().toISOString(),
    } satisfies TrackedSourceDetails;
};

const haveDetailsChanged = (current: TrackedSourceDetails | null, next: TrackedSourceDetails): boolean => {
    if (!current) {
        return true;
    }

    return (
        current.source !== next.source ||
        (current.medium ?? null) !== (next.medium ?? null) ||
        (current.campaign ?? null) !== (next.campaign ?? null) ||
        (current.referrer ?? null) !== (next.referrer ?? null)
    );
};

const hoursBetween = (start: string | null | undefined, end: Date): number | null => {
    if (!start) {
        return null;
    }

    const parsed = new Date(start);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    const diffMs = end.getTime() - parsed.getTime();
    return diffMs / (1000 * 60 * 60);
};

const storeDetails = (details: TrackedSourceDetails | null) => {
    if (!details) {
        safeRemoveItem(SOURCE_KEY);
        safeRemoveItem(SOURCE_DETAILS_KEY);
        return;
    }

    safeSetItem(SOURCE_KEY, details.source);
    safeSetItem(SOURCE_DETAILS_KEY, JSON.stringify(details));

    if (details.sessionId) {
        safeSetItem(SESSION_KEY, details.sessionId);
        safeSetItem(LEGACY_SESSION_KEY, details.sessionId);
    }
};

export const getStoredSource = (): string | null =>
    sanitizeValue(safeGetItem(SOURCE_KEY)) ?? resolveCookieSource();

export const getStoredSourceDetails = (): TrackedSourceDetails | null => {
    const stored = parseStoredDetails(safeGetItem(SOURCE_DETAILS_KEY));
    if (stored) {
        return stored;
    }

    const cookieDetails = readCookieDetails();
    if (!cookieDetails) {
        return null;
    }

    storeDetails(cookieDetails);
    return cookieDetails;
};

const buildPayload = (details: TrackedSourceDetails, sessionId: string | null): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
        source: details.source,
    };

    if (sessionId) {
        payload.session_id = sessionId;
    }
    if (details.medium) {
        payload.medium = details.medium;
    }
    if (details.campaign) {
        payload.campaign = details.campaign;
    }
    if (details.referrer) {
        payload.referrer = details.referrer;
    }

    return payload;
};

const shouldResend = (current: TrackedSourceDetails | null, next: TrackedSourceDetails): boolean => {
    if (!current) {
        return true;
    }

    if (haveDetailsChanged(current, next)) {
        return true;
    }

    if (!current.sessionId) {
        return true;
    }

    const hoursSinceSync = hoursBetween(current.lastSyncedAt, new Date());
    if (hoursSinceSync === null) {
        return true;
    }

    return hoursSinceSync >= 24;
};

export const trackSource = async (): Promise<TrackedSourceDetails | null> => {
    if (typeof window === 'undefined') {
        return null;
    }

    const detected = detectSourceDetails();
    if (!detected) {
        return null;
    }

    const stored = getStoredSourceDetails();
    const merged: TrackedSourceDetails = {
        ...stored,
        ...detected,
    };

    const signature = buildSignature(detected);
    const sessionState = readSessionSignature();

    const sessionId =
        safeGetItem(SESSION_KEY) ?? safeGetItem(LEGACY_SESSION_KEY) ?? stored?.sessionId ?? null;

    if (sessionState && sessionState.signature === signature) {
        if (sessionState.status === 'pending') {
            const cached = stored
                ? ({ ...stored, ...detected, sessionId: stored.sessionId ?? sessionId } satisfies TrackedSourceDetails)
                : ({ ...detected, sessionId } satisfies TrackedSourceDetails);
            storeDetails(cached);
            return cached;
        }

        if (sessionState.status === 'synced' && stored && stored.sessionId && !haveDetailsChanged(stored, detected)) {
            storeSessionSignature(signature, 'synced');
            const cached = { ...stored, ...detected, sessionId: stored.sessionId } satisfies TrackedSourceDetails;
            storeDetails(cached);
            return cached;
        }
    }

    storeSessionSignature(signature, 'pending');

    const needResend = shouldResend(stored, merged);

    if (!needResend) {
        storeDetails({ ...merged, sessionId });
        storeSessionSignature(signature, 'synced');
        return { ...merged, sessionId };
    }

    try {
        const response = await fetch('/api/track-source', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(buildPayload(merged, sessionId)),
        });

        if (response.ok) {
            const result = await response.json().catch(() => null);
            const returnedSession =
                result && typeof result.session_id === 'string' && result.session_id.trim().length > 0
                    ? result.session_id.trim()
                    : null;

            if (returnedSession) {
                merged.sessionId = returnedSession;
            } else if (sessionId) {
                merged.sessionId = sessionId;
            }

            merged.lastSyncedAt = new Date().toISOString();
            storeDetails(merged);
            storeSessionSignature(signature, 'synced');
            return merged;
        }

        console.warn('Tracking source a returnat un status neașteptat', response.status);
    } catch (error) {
        console.warn('Nu am putut trimite informațiile de atribuire către backend', error);
    }

    storeDetails({ ...merged, sessionId });
    storeSessionSignature(signature, 'synced');
    return { ...merged, sessionId };
};
