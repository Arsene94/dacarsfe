import { getBrowserCookieValue } from "@/lib/browserCookies";

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim();
const META_PIXEL_CLICK_ID_COOKIE_NAME = "_fbc";

const ADVANCED_MATCHING_STORAGE_KEY = "dacars:meta:advanced-matching";
const META_PIXEL_LEAD_STORAGE_KEY_PREFIX = "dacars:meta:lead:";
const META_PIXEL_LEAD_STORAGE_FALLBACK_KEY = "dacars:meta:lead:fallback";
const MAX_FB_QUEUE_ATTEMPTS = 10;
const FB_QUEUE_RETRY_DELAY_MS = 200;

export const META_PIXEL_EVENTS = {
    PAGE_VIEW: "PageView",
    VIEW_CONTENT: "ViewContent",
    LEAD: "Lead",
} as const;

type MetaPixelEventName = (typeof META_PIXEL_EVENTS)[keyof typeof META_PIXEL_EVENTS];

type FacebookPixelQueue = (...args: Array<unknown>) => void;

type AdvancedMatchingPayload = {
    em?: string;
    ph?: string;
    fn?: string;
    ln?: string;
    external_id?: string;
    ct?: string;
    st?: string;
    zp?: string;
    country?: string;
};

type NameParts = {
    firstName?: string;
    lastName?: string;
};

let advancedMatchingCache: AdvancedMatchingPayload = {};

const isBrowser = typeof window !== "undefined";

const withFbq = (
    callback: (fbq: FacebookPixelQueue) => void,
    attempt = 0,
): void => {
    if (!PIXEL_ID || !isBrowser) {
        return;
    }

    const fbWindow = window as typeof window & { fbq?: FacebookPixelQueue };
    if (typeof fbWindow.fbq === "function") {
        callback(fbWindow.fbq);
        return;
    }

    if (attempt >= MAX_FB_QUEUE_ATTEMPTS) {
        return;
    }

    window.setTimeout(() => {
        withFbq(callback, attempt + 1);
    }, FB_QUEUE_RETRY_DELAY_MS);
};

const normalizeString = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeEmail = (value: unknown): string | undefined => {
    const normalized = normalizeString(value);
    return normalized ? normalized.toLowerCase() : undefined;
};

const normalizePhone = (value: unknown): string | undefined => {
    if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
    }

    const raw = String(value).trim();
    if (!raw) {
        return undefined;
    }

    let digits = raw.replace(/\D+/g, "");

    if (raw.startsWith("00")) {
        digits = digits.replace(/^00/, "");
    }

    if (digits.length < 6) {
        return undefined;
    }

    return `+${digits}`;
};

const normalizeName = (value: unknown): string | undefined => {
    const normalized = normalizeString(value);
    return normalized ? normalized.toLowerCase() : undefined;
};

const normalizeExternalId = (value: unknown): string | undefined => {
    if (typeof value === "string" || typeof value === "number") {
        const normalized = String(value).trim();
        return normalized.length > 0 ? normalized : undefined;
    }

    return undefined;
};

const normalizeLocation = (value: unknown): string | undefined => {
    const normalized = normalizeName(value);
    return normalized ? normalized.replace(/\s+/g, "") : undefined;
};

const normalizePostalCode = (value: unknown): string | undefined => {
    if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized.toLowerCase() : undefined;
};

const sanitizeAdvancedMatching = (
    raw?: AdvancedMatchingPayload | null,
): AdvancedMatchingPayload => {
    if (!raw || typeof raw !== "object") {
        return {};
    }

    const sanitized: AdvancedMatchingPayload = {};

    const email = normalizeEmail(raw.em);
    if (email) {
        sanitized.em = email;
    }

    const phone = normalizePhone(raw.ph);
    if (phone) {
        sanitized.ph = phone;
    }

    const firstName = normalizeName(raw.fn);
    if (firstName) {
        sanitized.fn = firstName;
    }

    const lastName = normalizeName(raw.ln);
    if (lastName) {
        sanitized.ln = lastName;
    }

    const externalId = normalizeExternalId(raw.external_id);
    if (externalId) {
        sanitized.external_id = externalId;
    }

    const city = normalizeLocation(raw.ct);
    if (city) {
        sanitized.ct = city;
    }

    const state = normalizeLocation(raw.st);
    if (state) {
        sanitized.st = state;
    }

    const postalCode = normalizePostalCode(raw.zp);
    if (postalCode) {
        sanitized.zp = postalCode;
    }

    const country = normalizeLocation(raw.country);
    if (country) {
        sanitized.country = country;
    }

    return sanitized;
};

const mergeAdvancedMatching = (
    current: AdvancedMatchingPayload,
    incoming: AdvancedMatchingPayload,
): AdvancedMatchingPayload => {
    const merged: AdvancedMatchingPayload = { ...current };

    (Object.entries(incoming) as Array<[keyof AdvancedMatchingPayload, string]>).forEach(
        ([key, value]) => {
            if (value) {
                merged[key] = value;
            }
        },
    );

    return merged;
};

const persistAdvancedMatching = (payload: AdvancedMatchingPayload) => {
    if (!isBrowser) {
        return;
    }

    try {
        window.sessionStorage.setItem(
            ADVANCED_MATCHING_STORAGE_KEY,
            JSON.stringify(payload),
        );
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Nu s-a putut salva potrivirea avansată Meta în sessionStorage", error);
        }
    }
};

const sanitizeEventValue = (value: unknown): unknown => {
    if (value == null) {
        return undefined;
    }

    if (Array.isArray(value)) {
        const normalized = value
            .map((entry) => sanitizeEventValue(entry))
            .filter((entry) => entry !== undefined);
        return normalized.length > 0 ? normalized : undefined;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === "object") {
        const normalized: Record<string, unknown> = {};
        for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
            const sanitized = sanitizeEventValue(nestedValue);
            if (sanitized !== undefined) {
                normalized[key] = sanitized;
            }
        }
        return Object.keys(normalized).length > 0 ? normalized : undefined;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    return value;
};

const sanitizeEventPayload = (payload?: Record<string, unknown>) => {
    if (!payload) {
        return undefined;
    }

    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        const sanitized = sanitizeEventValue(value);
        if (sanitized !== undefined) {
            normalized[key] = sanitized;
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const buildLeadStorageKey = (identifier?: string | null): string => {
    const normalized = typeof identifier === "string" ? identifier.trim() : "";
    return normalized
        ? `${META_PIXEL_LEAD_STORAGE_KEY_PREFIX}${normalized}`
        : META_PIXEL_LEAD_STORAGE_FALLBACK_KEY;
};

export const isMetaPixelConfigured = (): boolean => Boolean(PIXEL_ID);

export const getMetaPixelAdvancedMatchingSnapshot = (): AdvancedMatchingPayload => ({
    ...advancedMatchingCache,
});

export const updateMetaPixelAdvancedMatching = (
    payload: AdvancedMatchingPayload,
    options: { persist?: boolean } = {},
): void => {
    if (!PIXEL_ID) {
        return;
    }

    const sanitized = sanitizeAdvancedMatching(payload);
    if (Object.keys(sanitized).length === 0) {
        return;
    }

    advancedMatchingCache = mergeAdvancedMatching(advancedMatchingCache, sanitized);

    if (options.persist !== false) {
        persistAdvancedMatching(advancedMatchingCache);
    }

    withFbq((fbq) => {
        fbq("init", PIXEL_ID, { ...advancedMatchingCache });
    });
};

export const bootstrapMetaPixelAdvancedMatching = (): void => {
    if (!isBrowser || !PIXEL_ID) {
        return;
    }

    try {
        const stored = window.sessionStorage.getItem(ADVANCED_MATCHING_STORAGE_KEY);
        if (!stored) {
            return;
        }

        const parsed = JSON.parse(stored) as AdvancedMatchingPayload | null;
        if (!parsed || typeof parsed !== "object") {
            return;
        }

        updateMetaPixelAdvancedMatching(parsed, { persist: false });
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Nu s-a putut restaura potrivirea avansată Meta", error);
        }
    }
};

const trackMetaPixelEvent = (
    eventName: MetaPixelEventName,
    payload?: Record<string, unknown>,
): void => {
    if (!PIXEL_ID) {
        return;
    }

    const eventPayload: Record<string, unknown> = payload ? { ...payload } : {};
    const clickId = getBrowserCookieValue(META_PIXEL_CLICK_ID_COOKIE_NAME);

    if (clickId) {
        const existingClickId = (eventPayload as { fbc?: unknown }).fbc;
        const hasCustomClickId =
            typeof existingClickId === "string" && existingClickId.trim().length > 0;

        if (!hasCustomClickId) {
            (eventPayload as { fbc?: string }).fbc = clickId;
        }
    }

    const sanitized = sanitizeEventPayload(eventPayload);
    withFbq((fbq) => {
        if (sanitized) {
            fbq("track", eventName, sanitized);
        } else {
            fbq("track", eventName);
        }
    });
};

export const trackMetaPixelPageView = (payload?: Record<string, unknown>): void => {
    trackMetaPixelEvent(META_PIXEL_EVENTS.PAGE_VIEW, payload);
};

export const trackMetaPixelViewContent = (payload?: Record<string, unknown>): void => {
    trackMetaPixelEvent(META_PIXEL_EVENTS.VIEW_CONTENT, payload);
};

export const trackMetaPixelLead = (payload?: Record<string, unknown>): void => {
    trackMetaPixelEvent(META_PIXEL_EVENTS.LEAD, payload);
};

export const hasTrackedMetaPixelLead = (identifier?: string | null): boolean => {
    if (!isBrowser) {
        return false;
    }

    try {
        const key = buildLeadStorageKey(identifier);
        return window.sessionStorage.getItem(key) === "1";
    } catch {
        return false;
    }
};

export const markMetaPixelLeadTracked = (identifier?: string | null): void => {
    if (!isBrowser) {
        return;
    }

    try {
        const key = buildLeadStorageKey(identifier);
        window.sessionStorage.setItem(key, "1");
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Nu s-a putut salva statusul evenimentului Meta Lead", error);
        }
    }
};

export const resolveMetaPixelNameParts = (fullName: unknown): NameParts => {
    if (typeof fullName !== "string") {
        return {};
    }

    const trimmed = fullName.trim();
    if (!trimmed) {
        return {};
    }

    const segments = trimmed.split(/\s+/).filter(Boolean);
    if (segments.length === 0) {
        return {};
    }

    const [firstName, ...rest] = segments;
    const lastName = rest.length > 0 ? rest.join(" ") : undefined;

    return {
        firstName,
        lastName,
    };
};
