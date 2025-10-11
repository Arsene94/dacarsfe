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

type PageViewRecord = {
    key: string;
    timestamp: number;
};

type PageViewContext = {
    pathname?: string | null;
    search?: string | null;
    hash?: string | null;
    historyKey?: string | null;
};

type FbqFunction = ((...args: unknown[]) => void) & {
    getState?: () => FbqState | undefined;
};

declare global {
    interface Window {
        fbq?: FbqFunction;
        _fbq?: FbqFunction;
        __META_PIXEL_ACTIVE_IDS__?: string[];
        __META_PIXEL_LAST_PAGE_VIEW__?: PageViewRecord | null;
    }
}

let pixelModulePromise: Promise<ReactFacebookPixel> | null = null;
let initPromise: Promise<ReactFacebookPixel> | null = null;

let lastPageViewRecord: PageViewRecord | null = null;

type MetaPixelAdvancedMatchingKey =
    | "em"
    | "ph"
    | "fn"
    | "ln"
    | "ct"
    | "st"
    | "zp"
    | "country"
    | "external_id";

type MetaPixelAdvancedMatchingUpdate = Partial<{
    email: string | null | undefined;
    phone: string | null | undefined;
    fullName: string | null | undefined;
    firstName: string | null | undefined;
    lastName: string | null | undefined;
    city: string | null | undefined;
    state: string | null | undefined;
    postalCode: string | null | undefined;
    country: string | null | undefined;
    externalId: string | number | null | undefined;
}>;

type MetaPixelAdvancedMatchingPayload = Partial<Record<MetaPixelAdvancedMatchingKey, string>>;

const advancedMatchingStore: MetaPixelAdvancedMatchingPayload = {};

let advancedMatchingDirty = true;
let lastAdvancedMatchingSignature: string | null = null;

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

const sanitizeString = (value: unknown): string | null => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return null;
        }
        return String(value);
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    return null;
};

const sanitizeName = (value: unknown): string | null => {
    const normalized = sanitizeString(value);
    if (!normalized) {
        return null;
    }

    const condensed = normalized.replace(/\s+/g, " ");
    return condensed.length > 0 ? condensed : null;
};

const splitFullName = (
    value: unknown,
): { firstName: string | null; lastName: string | null } => {
    const sanitized = sanitizeName(value);
    if (!sanitized) {
        return { firstName: null, lastName: null };
    }

    const parts = sanitized.split(" ").filter((entry) => entry.length > 0);
    if (parts.length === 0) {
        return { firstName: null, lastName: null };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: null };
    }

    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const sanitizeEmail = (value: unknown): string | null => {
    const normalized = sanitizeString(value);
    if (!normalized) {
        return null;
    }

    const email = normalized.toLowerCase();
    if (!email.includes("@")) {
        return null;
    }

    return email;
};

const sanitizePhone = (value: unknown): string | null => {
    const normalized = sanitizeString(value);
    if (!normalized) {
        return null;
    }

    const digits = normalized.replace(/\D+/g, "");
    if (digits.length < 6) {
        return null;
    }

    return digits;
};

const sanitizePostalCode = (value: unknown): string | null => {
    const normalized = sanitizeString(value);
    if (!normalized) {
        return null;
    }

    const condensed = normalized.replace(/\s+/g, "");
    return condensed.length > 0 ? condensed : null;
};

const sanitizeCountry = (value: unknown): string | null => {
    const normalized = sanitizeString(value);
    if (!normalized) {
        return null;
    }

    const country = normalized.replace(/\s+/g, "").toUpperCase();
    if (country.length < 2 || country.length > 3) {
        return null;
    }

    return country;
};

const sanitizeExternalId = (value: unknown): string | null => {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return null;
        }
        return String(value);
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    return null;
};

const updateAdvancedMatchingEntry = (
    key: MetaPixelAdvancedMatchingKey,
    value: string | null,
): boolean => {
    const normalized = value && value.length > 0 ? value : undefined;
    const currentValue = advancedMatchingStore[key];

    if (normalized !== undefined) {
        if (currentValue === normalized) {
            return false;
        }

        advancedMatchingStore[key] = normalized;
        return true;
    }

    if (currentValue !== undefined) {
        delete advancedMatchingStore[key];
        return true;
    }

    return false;
};

const buildAdvancedMatchingPayload = (): MetaPixelAdvancedMatchingPayload => {
    const entries = Object.entries(advancedMatchingStore).filter(
        (entry): entry is [MetaPixelAdvancedMatchingKey, string] =>
            typeof entry[1] === "string" && entry[1].length > 0,
    );

    if (entries.length === 0) {
        return {};
    }

    return Object.fromEntries(entries) as MetaPixelAdvancedMatchingPayload;
};

const serializeAdvancedMatchingPayload = (payload: MetaPixelAdvancedMatchingPayload): string => {
    const entries = Object.entries(payload).sort(([left], [right]) => left.localeCompare(right));
    if (entries.length === 0) {
        return "{}";
    }

    return JSON.stringify(Object.fromEntries(entries));
};

const initializePixel = (pixel: ReactFacebookPixel) => {
    const pixelId = META_PIXEL_ID as string;
    const advancedMatchingPayload = buildAdvancedMatchingPayload();
    const signature = serializeAdvancedMatchingPayload(advancedMatchingPayload);
    const alreadyInitialized = isPixelAlreadyInitialized(pixelId);

    if (!alreadyInitialized || lastAdvancedMatchingSignature !== signature) {
        const hasAdvancedMatchingEntries = Object.keys(advancedMatchingPayload).length > 0;
        pixel.init(pixelId, hasAdvancedMatchingEntries ? advancedMatchingPayload : undefined, {
            autoConfig: false,
            debug: process.env.NODE_ENV !== "production",
        });
        markPixelInitialized(pixelId);
        lastAdvancedMatchingSignature = signature;
    }

    advancedMatchingDirty = false;

    return pixel;
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
            .then((pixel) => initializePixel(pixel))
            .catch((error) => {
                logDevWarning("Nu s-a putut inițializa Meta Pixel", error);
                initPromise = null;
                throw error;
            });

        return initPromise;
    }

    if (advancedMatchingDirty) {
        initPromise
            .then((pixel) => {
                initializePixel(pixel);
            })
            .catch((error) => {
                logDevWarning("Nu s-au putut actualiza datele de matching Meta Pixel", error);
            });
    }

    return initPromise;
};

export const updateMetaPixelAdvancedMatching = (update: MetaPixelAdvancedMatchingUpdate) => {
    if (!update || typeof update !== "object") {
        return;
    }

    let hasChanged = false;

    if ("fullName" in update) {
        const { firstName, lastName } = splitFullName(update.fullName);
        hasChanged = updateAdvancedMatchingEntry("fn", firstName) || hasChanged;
        hasChanged = updateAdvancedMatchingEntry("ln", lastName) || hasChanged;
    }

    if ("firstName" in update) {
        hasChanged = updateAdvancedMatchingEntry("fn", sanitizeName(update.firstName)) || hasChanged;
    }

    if ("lastName" in update) {
        hasChanged = updateAdvancedMatchingEntry("ln", sanitizeName(update.lastName)) || hasChanged;
    }

    if ("email" in update) {
        hasChanged = updateAdvancedMatchingEntry("em", sanitizeEmail(update.email)) || hasChanged;
    }

    if ("phone" in update) {
        hasChanged = updateAdvancedMatchingEntry("ph", sanitizePhone(update.phone)) || hasChanged;
    }

    if ("city" in update) {
        hasChanged = updateAdvancedMatchingEntry("ct", sanitizeName(update.city)) || hasChanged;
    }

    if ("state" in update) {
        hasChanged = updateAdvancedMatchingEntry("st", sanitizeName(update.state)) || hasChanged;
    }

    if ("postalCode" in update) {
        hasChanged = updateAdvancedMatchingEntry("zp", sanitizePostalCode(update.postalCode)) || hasChanged;
    }

    if ("country" in update) {
        hasChanged = updateAdvancedMatchingEntry("country", sanitizeCountry(update.country)) || hasChanged;
    }

    if ("externalId" in update) {
        hasChanged = updateAdvancedMatchingEntry("external_id", sanitizeExternalId(update.externalId)) || hasChanged;
    }

    if (!hasChanged) {
        return;
    }

    advancedMatchingDirty = true;

    const promise = ensureInitializedPixel();
    if (promise) {
        promise.catch(() => {
            // avertismentele sunt jurnalizate în ensureInitializedPixel
        });
    }
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

const readHistoryKey = (): string | null => {
    if (!isBrowser) {
        return null;
    }

    try {
        const state = window.history?.state as { key?: unknown } | undefined;
        const key = state?.key;
        return typeof key === "string" && key.length > 0 ? key : null;
    } catch {
        return null;
    }
};

const buildLocationKey = (context?: PageViewContext): string | null => {
    const sourcePathname = context?.pathname ?? (isBrowser ? window.location?.pathname ?? "" : "");
    const pathname = typeof sourcePathname === "string" ? sourcePathname : "";

    if (!pathname || pathname.trim().length === 0) {
        return null;
    }

    const normalizedPathname = pathname.trim();

    const historyKey = context?.historyKey ?? readHistoryKey();

    if (historyKey) {
        return `${normalizedPathname}|${historyKey}`;
    }

    return normalizedPathname;
};

const getLastPageViewRecord = (): PageViewRecord | null => {
    if (isBrowser && window.__META_PIXEL_LAST_PAGE_VIEW__) {
        return window.__META_PIXEL_LAST_PAGE_VIEW__ ?? null;
    }

    return lastPageViewRecord;
};

const markPageViewForKey = (key: string) => {
    const record: PageViewRecord = {
        key,
        timestamp: Date.now(),
    };

    lastPageViewRecord = record;

    if (isBrowser) {
        window.__META_PIXEL_LAST_PAGE_VIEW__ = record;
    }
};

const clearPageViewForKey = (key: string) => {
    if (lastPageViewRecord?.key === key) {
        lastPageViewRecord = null;
    }

    if (isBrowser) {
        const existingRecord = window.__META_PIXEL_LAST_PAGE_VIEW__;
        if (existingRecord?.key === key) {
            window.__META_PIXEL_LAST_PAGE_VIEW__ = null;
        }
    }
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

export const trackMetaPixelPageView = (context?: PageViewContext) => {
    const promise = ensureInitializedPixel();
    if (!promise) {
        return;
    }

    promise
        .then((pixel) => {
            const locationKey = buildLocationKey(context);

            if (locationKey) {
                const lastRecord = getLastPageViewRecord();
                if (lastRecord?.key === locationKey) {
                    logDevWarning("Eveniment PageView Meta Pixel ignorat – locația curentă a fost deja raportată.");
                    return;
                }

                markPageViewForKey(locationKey);
            }

            try {
                pixel.pageView();
            } catch (error) {
                if (locationKey) {
                    clearPageViewForKey(locationKey);
                }
                throw error;
            }
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

