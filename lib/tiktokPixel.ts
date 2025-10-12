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

const enqueueEvent = (
    queue: TikTokQueue,
    method: keyof Pick<TikTokQueue, "page" | "track">,
    args: Array<unknown>,
) => {
    try {
        if (typeof queue.push === "function") {
            queue.push([method, ...args]);
            return;
        }

        if (Array.isArray(queue)) {
            (queue as unknown as Array<unknown>).push([method, ...args]);
        }
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                `Nu am putut pune în coadă evenimentul TikTok ${method}`,
                error,
            );
        }
    }
};

const dispatchEvent = (
    queue: TikTokQueue,
    method: keyof Pick<TikTokQueue, "page" | "track">,
    args: Array<unknown>,
) => {
    try {
        if (typeof queue.call === "function") {
            queue.call(method, ...args);
            return;
        }

        if (method === "track" && typeof queue.track === "function") {
            queue.track(...(args as Parameters<NonNullable<TikTokQueue["track"]>>));
            return;
        }

        if (method === "page" && typeof queue.page === "function") {
            queue.page(...(args as Parameters<TikTokQueue["page"]>));
            return;
        }
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                `Nu am putut trimite direct evenimentul TikTok ${method}`,
                error,
            );
        }
    }

    enqueueEvent(queue, method, args);
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

const toContentIdentifier = (value: unknown): string | null => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return null;
};

const extractContentIdentifiers = (contents: Array<unknown>): Array<string> =>
    contents
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }

            const contentId = (entry as { content_id?: unknown }).content_id;
            return toContentIdentifier(contentId ?? null);
        })
        .filter((identifier): identifier is string => identifier !== null);

const hasValidPrimaryContentId = (value: unknown): boolean => {
    if (typeof value === "string") {
        return value.trim().length > 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value);
    }

    return false;
};

const hasValidContentIds = (value: unknown): boolean =>
    Array.isArray(value) && value.some((entry) => hasValidPrimaryContentId(entry));

const augmentContentIdentifiers = (payload: Record<string, unknown>): Record<string, unknown> => {
    const normalized: Record<string, unknown> = { ...payload };
    const contents = (payload as { contents?: unknown }).contents;

    if (!Array.isArray(contents) || contents.length === 0) {
        return normalized;
    }

    const identifiers = extractContentIdentifiers(contents);
    if (identifiers.length === 0) {
        return normalized;
    }

    if (!hasValidPrimaryContentId(normalized["content_id"])) {
        normalized.content_id = identifiers[0];
    }

    if (!hasValidContentIds(normalized["content_ids"])) {
        normalized.content_ids = identifiers;
    }

    return normalized;
};

const sanitizePayload = (payload?: Record<string, unknown>): Record<string, unknown> | undefined => {
    if (!payload) {
        return undefined;
    }

    const normalized = augmentContentIdentifiers(payload);

    const sanitized = sanitizeValue(normalized);
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
    LEAD: "Lead",
    COMPLETE_PAYMENT: "CompletePayment",
    CONTACT: "Contact",
} as const;

export type TikTokEventName = (typeof TIKTOK_EVENTS)[keyof typeof TIKTOK_EVENTS];

export const TIKTOK_CONTENT_TYPE = "vehicle" as const;

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

    dispatchEvent(queue, "page", []);
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

    const args: Array<unknown> = sanitizedPayload
        ? [eventName, sanitizedPayload]
        : [eventName];

    dispatchEvent(queue, "track", args);
};

export const isTikTokPixelConfigured = () => hasPixelId();

