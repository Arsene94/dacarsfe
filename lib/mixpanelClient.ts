"use client";

import type mixpanel from "mixpanel-browser";
import type { Config as MixpanelConfig } from "mixpanel-browser";

const MIXPANEL_TOKEN = "a53fd216120538a8317818b44e4e50a3";

const MIXPANEL_CONFIG: Partial<MixpanelConfig> = {
    autocapture: true,
    record_sessions_percent: 100,
    api_host: "https://api-eu.mixpanel.com",
    batch_requests: true,
    batch_size: 50,
    batch_flush_interval_ms: 5000,
    ignore_dnt: false,
    ip: false,
    property_blacklist: ['$device_id'],
    opt_out_tracking_by_default: false,
    opt_out_tracking_persistence_type: 'localStorage',
    persistence: 'localStorage',
    cross_subdomain_cookie: false,
    secure_cookie: true,
};

export const MIXPANEL_EVENTS = {
    PAGE_VIEW: "Page View",
} as const;

export type MixpanelEventName = (typeof MIXPANEL_EVENTS)[keyof typeof MIXPANEL_EVENTS];

type MixpanelTraits = Record<string, unknown>;

type MixpanelProperties = Record<string, unknown>;

type MixpanelInstance = typeof mixpanel;

let isInitialized = false;
let mixpanelInstance: MixpanelInstance | null = null;
let mixpanelLoader: Promise<MixpanelInstance> | null = null;

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

const loadMixpanel = async (): Promise<MixpanelInstance | null> => {
    if (mixpanelInstance) {
        return mixpanelInstance;
    }

    if (!mixpanelLoader) {
        mixpanelLoader = import("mixpanel-browser")
            .then((module) => {
                const resolved = (module.default ?? module) as unknown as MixpanelInstance;
                mixpanelInstance = resolved;
                return resolved;
            })
            .catch((error) => {
                mixpanelLoader = null;
                mixpanelInstance = null;
                if (process.env.NODE_ENV !== "production") {
                    console.error("Nu am putut încărca librăria Mixpanel", error);
                }
                throw error;
            });
    }

    try {
        return await mixpanelLoader;
    } catch {
        return null;
    }
};

const withMixpanel = async (
    callback: (instance: MixpanelInstance) => void,
    options: { initialize?: boolean } = {},
): Promise<void> => {
    if (!canUseMixpanel()) {
        return;
    }

    const instance = await loadMixpanel();
    if (!instance) {
        return;
    }

    const shouldInitialize = options.initialize !== false;

    if (shouldInitialize && !isInitialized) {
        instance.init(MIXPANEL_TOKEN, MIXPANEL_CONFIG);
        isInitialized = true;
    }

    callback(instance);
};

export const initMixpanel = () => {
    void withMixpanel(() => {
        // Inițializarea este gestionată în withMixpanel.
    });
};

export const trackMixpanelEvent = (
    eventName: MixpanelEventName | string,
    properties?: MixpanelProperties,
) => {
    const trimmedEventName = typeof eventName === "string" ? eventName.trim() : "";

    if (!trimmedEventName) {
        return;
    }

    const sanitized = sanitizeObject(properties);

    void withMixpanel((instance) => {
        if (sanitized && Object.keys(sanitized).length > 0) {
            instance.track(trimmedEventName, sanitized);
            return;
        }

        instance.track(trimmedEventName);
    });
};

export const trackPageView = (url?: string | null) => {
    const payload = typeof url === "string" && url.trim().length > 0 ? { url } : undefined;
    trackMixpanelEvent(MIXPANEL_EVENTS.PAGE_VIEW, payload);
};

export const identifyMixpanelUser = (id: string, traits?: MixpanelTraits) => {
    const trimmedId = id.trim();

    if (!trimmedId) {
        return;
    }

    const sanitizedTraits = sanitizeObject(traits);

    void withMixpanel((instance) => {
        instance.identify(trimmedId);
        instance.register({
            mixpanel_user_id: trimmedId,
            is_authenticated: true,
        });

        if (sanitizedTraits && typeof instance.people?.set === "function") {
            instance.people.set(sanitizedTraits);
        }
    });
};

const generateAnonymousId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `anon:${crypto.randomUUID()}`;
    }

    return `anon:${Math.random().toString(36).slice(2, 12)}`;
};

export const identifyAnonymousMixpanelVisitor = async () => {
    await withMixpanel((instance) => {
        const existingDistinctId =
            typeof instance.get_distinct_id === "function"
                ? instance.get_distinct_id()
                : null;

        if (existingDistinctId && existingDistinctId.startsWith("anon:")) {
            return;
        }

        const anonymousId = generateAnonymousId();

        instance.identify(anonymousId);
        instance.register({
            mixpanel_user_id: anonymousId,
            is_authenticated: false,
            anonymous_identity_source: "generated",
        });
    });
};

export const resetMixpanelIdentity = () => {
    void withMixpanel(
        (instance) => {
            instance.reset();
            isInitialized = false;
        },
        { initialize: false },
    );
};
