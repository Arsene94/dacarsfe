const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type MetaPixelMethod = (...args: Array<unknown>) => void;

type MetaPixelFunction = MetaPixelMethod & {
    push: MetaPixelMethod;
    queue: Array<unknown>;
    callMethod?: MetaPixelMethod;
    loaded?: boolean;
    version?: string;
};

declare global {
    interface Window {
        fbq?: MetaPixelFunction;
        _fbq?: MetaPixelFunction;
    }
}

const isBrowser = typeof window !== "undefined";

const hasPixelId = (): boolean => Boolean(META_PIXEL_ID && META_PIXEL_ID.trim().length > 0);

const ensureQueue = (): MetaPixelFunction | null => {
    if (!isBrowser) {
        return null;
    }

    if (!hasPixelId()) {
        return null;
    }

    const existing = window.fbq;
    if (existing && typeof existing === "function") {
        return existing;
    }

    const queue = function (...args: Array<unknown>) {
        if (queue.callMethod) {
            queue.callMethod(...args);
        } else {
            queue.queue.push(args);
        }
    } as MetaPixelFunction;

    queue.push = function (...args: Array<unknown>) {
        queue(...args);
    };
    queue.queue = [];
    queue.loaded = false;
    queue.version = "2.0";

    window.fbq = queue;

    return queue;
};

const resolveQueue = (): MetaPixelFunction | null => {
    if (!isBrowser) {
        return null;
    }

    if (!hasPixelId()) {
        return null;
    }

    const queue = ensureQueue();
    if (!queue) {
        return null;
    }

    if (typeof queue !== "function") {
        return null;
    }

    return queue;
};

const sanitizeValue = (value: unknown): unknown => {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (Array.isArray(value)) {
        const sanitizedArray = value
            .map((entry) => sanitizeValue(entry))
            .filter((entry): entry is Exclude<ReturnType<typeof sanitizeValue>, undefined> => entry !== undefined);

        return sanitizedArray.length > 0 ? sanitizedArray : undefined;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
    }

    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .reduce<Array<readonly [string, unknown]>>((acc, [key, entryValue]) => {
                const sanitizedEntry = sanitizeValue(entryValue);
                if (sanitizedEntry === undefined) {
                    return acc;
                }

                acc.push([key, sanitizedEntry] as const);
                return acc;
            }, []);

        if (entries.length === 0) {
            return undefined;
        }

        return Object.fromEntries(entries);
    }

    return value;
};

const sanitizePayload = (payload?: Record<string, unknown>): Record<string, unknown> | undefined => {
    if (!payload) {
        return undefined;
    }

    const sanitized = sanitizeValue(payload);
    if (!sanitized || typeof sanitized !== "object") {
        return undefined;
    }

    return sanitized as Record<string, unknown>;
};

export const META_PIXEL_EVENTS = {
    PAGE_VIEW: "PageView",
    VIEW_CONTENT: "ViewContent",
    SEARCH: "Search",
    ADD_TO_CART: "AddToCart",
    INITIATE_CHECKOUT: "InitiateCheckout",
    LEAD: "Lead",
    CONTACT: "Contact",
    PURCHASE: "Purchase",
} as const;

export type MetaPixelEventName = (typeof META_PIXEL_EVENTS)[keyof typeof META_PIXEL_EVENTS];

export const initMetaPixel = () => {
    ensureQueue();
};

export const trackMetaPixelPageView = () => {
    const queue = resolveQueue();
    if (!queue) {
        return;
    }

    try {
        queue("track", META_PIXEL_EVENTS.PAGE_VIEW);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Nu s-a putut trimite PageView către Meta Pixel", error);
        }
    }
};

export const trackMetaPixelEvent = (
    eventName: MetaPixelEventName,
    payload?: Record<string, unknown>,
) => {
    const queue = resolveQueue();
    if (!queue) {
        return;
    }

    if (typeof eventName !== "string" || eventName.trim().length === 0) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Eveniment Meta Pixel ignorat – nume invalid", eventName);
        }
        return;
    }

    const sanitizedPayload = sanitizePayload(payload);

    try {
        if (sanitizedPayload) {
            queue("track", eventName, sanitizedPayload);
        } else {
            queue("track", eventName);
        }
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`Nu s-a putut trimite evenimentul Meta Pixel ${eventName}`, error);
        }
    }
};

export const isMetaPixelConfigured = () => hasPixelId();

