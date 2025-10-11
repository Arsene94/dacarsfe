const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

const isBrowser = typeof window !== "undefined";

const hasPixelId = (): boolean => Boolean(META_PIXEL_ID && META_PIXEL_ID.trim().length > 0);

type ReactFacebookPixel = {
    init: (
        pixelId: string,
        advancedMatching?: Record<string, unknown>,
        options?: {
            autoConfig?: boolean;
            debug?: boolean;
        },
    ) => void;
    pageView: () => void;
    track: (eventName: string, data?: Record<string, unknown>) => void;
};

type FbqState = {
    pixelsByID?: Record<string, unknown>;
    loadedPixels?: unknown;
};

type FbqFunction = ((...args: unknown[]) => void) & {
    getState?: () => FbqState | undefined;
};

declare global {
    interface Window {
        fbq?: FbqFunction;
        _fbq?: FbqFunction;
        __META_PIXEL_ACTIVE_IDS__?: string[];
    }
}

let pixelModulePromise: Promise<ReactFacebookPixel> | null = null;
let initPromise: Promise<ReactFacebookPixel> | null = null;

const markPixelInitialized = (pixelId: string) => {
    if (!isBrowser) {
        return;
    }

    if (!Array.isArray(window.__META_PIXEL_ACTIVE_IDS__)) {
        window.__META_PIXEL_ACTIVE_IDS__ = [];
    }

    if (!window.__META_PIXEL_ACTIVE_IDS__!.includes(pixelId)) {
        window.__META_PIXEL_ACTIVE_IDS__!.push(pixelId);
    }
};

const isPixelAlreadyInitialized = (pixelId: string): boolean => {
    if (!isBrowser) {
        return false;
    }

    const activeIds = window.__META_PIXEL_ACTIVE_IDS__;
    if (Array.isArray(activeIds) && activeIds.includes(pixelId)) {
        return true;
    }

    const fbq = window.fbq;
    if (fbq && typeof fbq === "function" && typeof fbq.getState === "function") {
        try {
            const state = fbq.getState();
            if (state && typeof state === "object") {
                const { pixelsByID, loadedPixels } = state as {
                    pixelsByID?: Record<string, unknown>;
                    loadedPixels?: unknown;
                };

                if (Array.isArray(loadedPixels) && loadedPixels.includes(pixelId)) {
                    markPixelInitialized(pixelId);
                    return true;
                }

                if (pixelsByID && typeof pixelsByID === "object" && pixelId in pixelsByID) {
                    markPixelInitialized(pixelId);
                    return true;
                }
            }
        } catch {
            // ignorăm erorile de introspecție; dacă starea nu poate fi citită revenim la logica noastră
        }
    }

    return false;
};

const loadPixelModule = (): Promise<ReactFacebookPixel> => {
    if (!pixelModulePromise) {
        pixelModulePromise = import("react-facebook-pixel").then((module) => {
            const resolved = (module as { default?: ReactFacebookPixel }).default ?? (module as unknown as ReactFacebookPixel);
            return resolved;
        });
    }

    return pixelModulePromise;
};

const logDevWarning = (message: string, error?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
        if (error) {
            console.warn(message, error);
        } else {
            console.warn(message);
        }
    }
};

const ensureInitializedPixel = (): Promise<ReactFacebookPixel> | null => {
    if (!isBrowser) {
        return null;
    }

    if (!hasPixelId()) {
        return null;
    }

    if (!initPromise) {
        initPromise = loadPixelModule()
            .then((pixel) => {
                const pixelId = META_PIXEL_ID as string;

                if (!isPixelAlreadyInitialized(pixelId)) {
                    pixel.init(pixelId, undefined, {
                        autoConfig: true,
                        debug: process.env.NODE_ENV !== "production",
                    });
                    markPixelInitialized(pixelId);
                }

                return pixel;
            })
            .catch((error) => {
                logDevWarning("Nu s-a putut inițializa Meta Pixel", error);
                initPromise = null;
                throw error;
            });
    }

    return initPromise;
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
        const entries = Object.entries(value as Record<string, unknown>);
        const sanitizedEntries = entries.reduce<Array<readonly [string, unknown]>>((acc, [key, entryValue]) => {
            const sanitizedEntry = sanitizeValue(entryValue);
            if (sanitizedEntry === undefined) {
                return acc;
            }

            acc.push([key, sanitizedEntry] as const);
            return acc;
        }, []);

        if (sanitizedEntries.length === 0) {
            return undefined;
        }

        return Object.fromEntries(sanitizedEntries);
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
    LEAD: "Lead",
} as const;

export type MetaPixelEventName = (typeof META_PIXEL_EVENTS)[keyof typeof META_PIXEL_EVENTS];

export const initMetaPixel = () => {
    const promise = ensureInitializedPixel();
    if (!promise) {
        return;
    }

    promise.catch(() => {
        // avertismentele sunt gestionate în ensureInitializedPixel
    });
};

export const trackMetaPixelPageView = () => {
    const promise = ensureInitializedPixel();
    if (!promise) {
        return;
    }

    promise
        .then((pixel) => {
            pixel.pageView();
        })
        .catch((error) => {
            logDevWarning("Nu s-a putut trimite PageView către Meta Pixel", error);
        });
};

export const trackMetaPixelEvent = (
    eventName: MetaPixelEventName,
    payload?: Record<string, unknown>,
) => {
    if (typeof eventName !== "string" || eventName.trim().length === 0) {
        logDevWarning("Eveniment Meta Pixel ignorat – nume invalid", eventName);
        return;
    }

    const promise = ensureInitializedPixel();
    if (!promise) {
        return;
    }

    const sanitizedPayload = sanitizePayload(payload);

    promise
        .then((pixel) => {
            if (sanitizedPayload) {
                pixel.track(eventName, sanitizedPayload);
            } else {
                pixel.track(eventName);
            }
        })
        .catch((error) => {
            logDevWarning(`Nu s-a putut trimite evenimentul Meta Pixel ${eventName}`, error);
        });
};

export const isMetaPixelConfigured = () => hasPixelId();

