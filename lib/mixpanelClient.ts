"use client";

// Import Mixpanel SDK
import mixpanel from "mixpanel-browser";
import type { Config as MixpanelConfig } from "mixpanel-browser";

const MIXPANEL_TOKEN = "a53fd216120538a8317818b44e4e50a3";

const MIXPANEL_CONFIG: Partial<MixpanelConfig> = {
    autocapture: true,
    record_sessions_percent: 100,
    api_host: "https://api-eu.mixpanel.com",
};

export const MIXPANEL_EVENTS = {
    PAGE_VIEW: "Page View",
} as const;

export type MixpanelEventName = (typeof MIXPANEL_EVENTS)[keyof typeof MIXPANEL_EVENTS];

type MixpanelTraits = Record<string, unknown>;

type MixpanelProperties = Record<string, unknown>;

let isInitialized = false;

const canUseMixpanel = () => typeof window !== "undefined";

const sanitizeObject = <T extends Record<string, unknown>>(payload?: T) => {
    if (!payload) {
        return undefined;
    }

    const sanitized = Object.entries(payload).reduce<MixpanelProperties>((acc, [key, value]) => {
        if (value === undefined) {
            return acc;
        }

        if (value instanceof Date) {
            acc[key] = value.toISOString();
            return acc;
        }

        if (Array.isArray(value)) {
            acc[key] = value.filter((item) => item !== undefined);
            return acc;
        }

        if (typeof value === "object" && value !== null) {
            const nested = sanitizeObject(value as Record<string, unknown>);
            if (nested && Object.keys(nested).length > 0) {
                acc[key] = nested;
            }
            return acc;
        }

        acc[key] = value;
        return acc;
    }, {});

    if (Object.keys(sanitized).length === 0) {
        return undefined;
    }

    return sanitized;
};

const ensureMixpanel = () => {
    if (!canUseMixpanel()) {
        return false;
    }

    if (!isInitialized) {
        mixpanel.init(MIXPANEL_TOKEN, MIXPANEL_CONFIG);
        isInitialized = true;
    }

    return true;
};

export const initMixpanel = () => {
    ensureMixpanel();
};

export const trackMixpanelEvent = (
    eventName: MixpanelEventName | string,
    properties?: MixpanelProperties,
) => {
    if (!ensureMixpanel()) {
        return;
    }

    const trimmedEventName = typeof eventName === "string" ? eventName.trim() : "";

    if (!trimmedEventName) {
        return;
    }

    const sanitized = sanitizeObject(properties);

    if (sanitized && Object.keys(sanitized).length > 0) {
        mixpanel.track(trimmedEventName, sanitized);
        return;
    }

    mixpanel.track(trimmedEventName);
};

export const trackPageView = (url?: string | null) => {
    const payload = typeof url === "string" && url.trim().length > 0 ? { url } : undefined;
    trackMixpanelEvent(MIXPANEL_EVENTS.PAGE_VIEW, payload);
};

export const identifyMixpanelUser = (id: string, traits?: MixpanelTraits) => {
    if (!ensureMixpanel()) {
        return;
    }

    const trimmedId = id.trim();

    if (!trimmedId) {
        return;
    }

    mixpanel.identify(trimmedId);
    mixpanel.register({
        mixpanel_user_id: trimmedId,
        is_authenticated: true,
    });

    const sanitizedTraits = sanitizeObject(traits);

    if (sanitizedTraits && typeof mixpanel.people?.set === "function") {
        mixpanel.people.set(sanitizedTraits);
    }
};

const generateAnonymousId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `anon:${crypto.randomUUID()}`;
    }

    return `anon:${Math.random().toString(36).slice(2, 12)}`;
};

export const identifyAnonymousMixpanelVisitor = async () => {
    if (!ensureMixpanel()) {
        return;
    }

    const existingDistinctId =
        typeof mixpanel.get_distinct_id === "function"
            ? mixpanel.get_distinct_id()
            : null;

    if (existingDistinctId && existingDistinctId.startsWith("anon:")) {
        return;
    }

    const anonymousId = generateAnonymousId();

    mixpanel.identify(anonymousId);
    mixpanel.register({
        mixpanel_user_id: anonymousId,
        is_authenticated: false,
        anonymous_identity_source: "generated",
    });
};

export const resetMixpanelIdentity = () => {
    if (!canUseMixpanel()) {
        return;
    }

    mixpanel.reset();
    isInitialized = false;
};
