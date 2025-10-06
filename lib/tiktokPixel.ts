const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

type TikTokQueueMethod = (...args: Array<unknown>) => void;

type TikTokQueue = {
    page: TikTokQueueMethod;
    track: (eventName: string, payload?: Record<string, unknown>) => void;
    identify?: TikTokQueueMethod;
    instances?: TikTokQueueMethod;
    debug?: TikTokQueueMethod;
    on?: TikTokQueueMethod;
    off?: TikTokQueueMethod;
    once?: TikTokQueueMethod;
    ready?: TikTokQueueMethod;
    alias?: TikTokQueueMethod;
    group?: TikTokQueueMethod;
    enableCookie?: TikTokQueueMethod;
    disableCookie?: TikTokQueueMethod;
    push?: TikTokQueueMethod;
    call?: TikTokQueueMethod;
    _i?: Record<string, unknown>;
    _o?: Record<string, unknown>;
    _t?: Record<string, unknown>;
};

declare global {
    interface Window {
        ttq?: TikTokQueue;
    }
}

const isBrowser = typeof window !== "undefined";

const hasPixelId = (): boolean => Boolean(TIKTOK_PIXEL_ID && TIKTOK_PIXEL_ID.trim().length > 0);

const resolveQueue = (): TikTokQueue | null => {
    if (!isBrowser) {
        return null;
    }
    if (!hasPixelId()) {
        return null;
    }
    const queue = window.ttq;
    if (!queue || typeof queue.track !== "function" || typeof queue.page !== "function") {
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

export const TIKTOK_EVENTS = {
    PAGE_VIEW: "PageView",
    VIEW_CONTENT: "ViewContent",
    SEARCH: "Search",
    ADD_TO_CART: "AddToCart",
    INITIATE_CHECKOUT: "InitiateCheckout",
    SUBMIT_FORM: "SubmitForm",
    COMPLETE_PAYMENT: "CompletePayment",
    CONTACT: "Contact",
} as const;

export type TikTokEventName = (typeof TIKTOK_EVENTS)[keyof typeof TIKTOK_EVENTS];

export const initTikTokPixel = () => {
    if (!isBrowser) {
        return;
    }
    if (!hasPixelId()) {
        return;
    }
    if (!window.ttq) {
        window.ttq = [] as unknown as TikTokQueue;
    }
};

export const trackTikTokPageView = () => {
    const queue = resolveQueue();
    if (!queue) {
        return;
    }

    try {
        queue.page();
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Nu s-a putut trimite PageView către TikTok", error);
        }
    }
};

export const trackTikTokEvent = (
    eventName: TikTokEventName,
    payload?: Record<string, unknown>,
) => {
    const queue = resolveQueue();
    if (!queue) {
        return;
    }

    if (typeof eventName !== "string" || eventName.trim().length === 0) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Eveniment TikTok ignorat – nume invalid", eventName);
        }
        return;
    }

    const sanitizedPayload = sanitizePayload(payload);

    try {
        if (sanitizedPayload) {
            queue.track(eventName, sanitizedPayload);
        } else {
            queue.track(eventName);
        }
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`Nu s-a putut trimite evenimentul TikTok ${eventName}`, error);
        }
    }
};

export const isTikTokPixelConfigured = () => hasPixelId();

