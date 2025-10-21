import type {
    AnalyticsDeviceInfo,
    AnalyticsEventInput,
    AnalyticsMetadata,
    AnalyticsQueuedEvent,
} from "@/types/analytics";

const MAX_BATCH_SIZE = 50;
const MIN_BATCH_BEFORE_FLUSH = 10;
const FLUSH_INTERVAL_MS = 7000;
const STORAGE_KEYS = {
    visitor: "dacars:analytics:visitor_uuid",
    session: "dacars:analytics:session_uuid",
};

type FlushOptions = {
    useBeacon?: boolean;
};

const resolveBaseUrl = (): string => {
    const explicit = process.env.NEXT_PUBLIC_ANALYTICS_BASE_URL;
    if (explicit && explicit.trim().length > 0) {
        return explicit.replace(/\/$/, "");
    }

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backend && backend.trim().length > 0) {
        return backend.replace(/\/$/, "");
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl && apiUrl.trim().length > 0) {
        const sanitized = apiUrl.replace(/\/$/, "");
        return sanitized.replace(/\/(api|api\/v\d+)$/, "");
    }

    return "https://backend.dacars.ro";
};

const ANALYTICS_ENDPOINT = `${resolveBaseUrl()}/api/analytics/events` as const;

const isBrowser = () => typeof window !== "undefined";

const queue: AnalyticsQueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let analyticsEnabled = false;
let inMemoryVisitorUuid: string | null = null;
let inMemorySessionUuid: string | null = null;
let lastTrackedPageUrl: string | null = null;

const generateUuid = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    const randomValues = new Uint8Array(16);
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        crypto.getRandomValues(randomValues);
    } else {
        for (let index = 0; index < randomValues.length; index += 1) {
            randomValues[index] = Math.floor(Math.random() * 256);
        }
    }

    randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
    randomValues[8] = (randomValues[8] & 0x3f) | 0x80;

    const byteToHex: string[] = [];
    for (let index = 0; index < 256; index += 1) {
        byteToHex[index] = index.toString(16).padStart(2, "0");
    }

    return (
        byteToHex[randomValues[0]] +
        byteToHex[randomValues[1]] +
        byteToHex[randomValues[2]] +
        byteToHex[randomValues[3]] +
        "-" +
        byteToHex[randomValues[4]] +
        byteToHex[randomValues[5]] +
        "-" +
        byteToHex[randomValues[6]] +
        byteToHex[randomValues[7]] +
        "-" +
        byteToHex[randomValues[8]] +
        byteToHex[randomValues[9]] +
        "-" +
        byteToHex[randomValues[10]] +
        byteToHex[randomValues[11]] +
        byteToHex[randomValues[12]] +
        byteToHex[randomValues[13]] +
        byteToHex[randomValues[14]] +
        byteToHex[randomValues[15]]
    );
};

const safeJsonStringify = (value: unknown): string | null => {
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.warn("Nu am putut serializa metadata analytics", error);
        return null;
    }
};

const readFromStorage = (
    storage: Storage,
    key: string,
    fallback: () => string,
): string => {
    try {
        const stored = storage.getItem(key);
        if (stored && stored.trim().length > 0) {
            return stored;
        }
        const generated = fallback();
        storage.setItem(key, generated);
        return generated;
    } catch (error) {
        console.warn(`Nu am putut accesa cheia ${key} din storage`, error);
        return fallback();
    }
};

const getVisitorUuid = (): string => {
    if (inMemoryVisitorUuid) {
        return inMemoryVisitorUuid;
    }

    if (isBrowser()) {
        const uuid = readFromStorage(window.localStorage, STORAGE_KEYS.visitor, generateUuid);
        inMemoryVisitorUuid = uuid;
        return uuid;
    }

    inMemoryVisitorUuid = generateUuid();
    return inMemoryVisitorUuid;
};

const setSessionUuid = (value: string) => {
    inMemorySessionUuid = value;
    if (!isBrowser()) {
        return;
    }
    try {
        window.sessionStorage.setItem(STORAGE_KEYS.session, value);
    } catch (error) {
        console.warn("Nu am putut salva session_uuid în sessionStorage", error);
    }
};

const getSessionUuid = (): string => {
    if (inMemorySessionUuid) {
        return inMemorySessionUuid;
    }

    if (isBrowser()) {
        const uuid = readFromStorage(window.sessionStorage, STORAGE_KEYS.session, generateUuid);
        inMemorySessionUuid = uuid;
        return uuid;
    }

    inMemorySessionUuid = generateUuid();
    return inMemorySessionUuid;
};

const toIsoString = (value?: Date | string): string => {
    if (!value) {
        return new Date().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }

    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return new Date().toISOString();
        }
        return date.toISOString();
    } catch (error) {
        console.warn("Nu am putut converti occurred_at în ISO8601", error);
        return new Date().toISOString();
    }
};

const sanitizeMetadata = (metadata?: AnalyticsMetadata | null): AnalyticsMetadata | undefined => {
    if (!metadata) {
        return undefined;
    }

    const sanitized: AnalyticsMetadata = {};
    Object.entries(metadata).forEach(([key, value]) => {
        if (value == null) {
            return;
        }
        if (key === "additional" && value && typeof value === "object") {
            try {
                sanitized.additional = JSON.parse(safeJsonStringify(value) ?? "null") ?? undefined;
            } catch (error) {
                console.warn("Nu am putut curăța metadata.additional", error);
            }
            return;
        }
        sanitized[key as keyof AnalyticsMetadata] = value as never;
    });

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const getDeviceInfo = (): AnalyticsDeviceInfo | undefined => {
    if (!isBrowser()) {
        return undefined;
    }

    try {
        const width = Math.round(window.innerWidth || 0);
        const height = Math.round(window.innerHeight || 0);
        const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
        const platform = nav.platform || nav.userAgentData?.platform;
        const language = nav.language || nav.languages?.[0];
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const device: AnalyticsDeviceInfo = {};
        if (Number.isFinite(width)) {
            device.width = width;
        }
        if (Number.isFinite(height)) {
            device.height = height;
        }
        if (platform) {
            device.platform = platform;
        }
        if (language) {
            device.language = language;
        }
        if (timezone) {
            device.timezone = timezone;
        }

        return Object.keys(device).length > 0 ? device : undefined;
    } catch (error) {
        console.warn("Nu am putut determina informațiile despre dispozitiv", error);
        return undefined;
    }
};

const clearScheduledFlush = () => {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
};

const scheduleFlush = (force = false) => {
    if (!isBrowser()) {
        return;
    }

    if (force || queue.length >= MIN_BATCH_BEFORE_FLUSH) {
        void flushQueue();
        return;
    }

    if (flushTimer) {
        return;
    }

    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushQueue();
    }, FLUSH_INTERVAL_MS);
};

const buildPageUrl = (pageUrl?: string): string => {
    if (pageUrl && pageUrl.trim().length > 0) {
        return pageUrl;
    }

    if (!isBrowser()) {
        return "";
    }

    try {
        const { origin, pathname, search } = window.location;
        return `${origin}${pathname}${search}`;
    } catch (error) {
        console.warn("Nu am putut compune page_url", error);
        return "";
    }
};

const resolveReferrer = (explicit?: string | null): string | null => {
    if (typeof explicit === "string") {
        return explicit;
    }

    if (lastTrackedPageUrl) {
        return lastTrackedPageUrl;
    }

    if (!isBrowser()) {
        return null;
    }

    return document.referrer || null;
};

const enqueueEvent = (payload: AnalyticsEventInput) => {
    if (!analyticsEnabled) {
        return;
    }
    if (!payload.type || payload.type.trim().length === 0) {
        return;
    }
    if (!isBrowser()) {
        return;
    }

    const event: AnalyticsQueuedEvent = {
        type: payload.type,
        occurred_at: toIsoString(payload.occurredAt),
        page_url: buildPageUrl(payload.pageUrl),
    };

    const referrer = resolveReferrer(payload.referrerUrl ?? undefined);
    if (referrer) {
        event.referrer_url = referrer;
    }

    const metadata = sanitizeMetadata(payload.metadata ?? undefined);
    if (metadata) {
        event.metadata = metadata;
    }

    const includeDevice = payload.includeDevice !== false;
    if (includeDevice) {
        const device = getDeviceInfo();
        if (device) {
            event.device = device;
        }
    }

    queue.push(event);
    scheduleFlush(false);
};

const sendBatch = async (events: AnalyticsQueuedEvent[], options?: FlushOptions): Promise<boolean> => {
    if (events.length === 0) {
        return true;
    }

    const visitorUuid = getVisitorUuid();
    const sessionUuid = getSessionUuid();

    const payload = {
        visitor_uuid: visitorUuid,
        session_uuid: sessionUuid,
        events,
    };

    const body = safeJsonStringify(payload);
    if (!body) {
        return false;
    }

    if (options?.useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        try {
            const blob = new Blob([body], { type: "application/json" });
            const ok = navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
            if (ok) {
                return true;
            }
        } catch (error) {
            console.warn("Eșec la trimiterea beacon-ului analytics", error);
        }
    }

    if (typeof fetch !== "function") {
        return false;
    }

    try {
        const response = await fetch(ANALYTICS_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body,
            keepalive: options?.useBeacon === true,
            credentials: "omit",
        });

        if (!response.ok) {
            console.warn("Request analytics nereușit", response.status);
            return false;
        }

        try {
            const data = await response.json();
            const nextSession = data?.session_uuid;
            if (typeof nextSession === "string" && nextSession.trim().length > 0) {
                setSessionUuid(nextSession);
            }
        } catch (error) {
            // Răspunsul poate fi gol sau fără JSON; ignorăm
        }

        return true;
    } catch (error) {
        console.warn("Eroare la trimiterea evenimentelor analytics", error);
        return false;
    }
};

export const flushQueue = async (options?: FlushOptions) => {
    if (queue.length === 0) {
        return;
    }

    clearScheduledFlush();

    if (options?.useBeacon) {
        while (queue.length > 0) {
            const batch = queue.slice(0, MAX_BATCH_SIZE);
            const sent = await sendBatch(batch, options);
            if (!sent) {
                break;
            }
            queue.splice(0, batch.length);
        }
        return;
    }

    if (isFlushing) {
        return;
    }

    isFlushing = true;
    try {
        while (queue.length > 0) {
            const batch = queue.slice(0, MAX_BATCH_SIZE);
            const sent = await sendBatch(batch);
            if (!sent) {
                break;
            }
            queue.splice(0, batch.length);
        }
    } finally {
        isFlushing = false;
    }
};

export const enableAnalyticsTracking = () => {
    analyticsEnabled = true;
    getVisitorUuid();
    getSessionUuid();
};

export const disableAnalyticsTracking = () => {
    analyticsEnabled = false;
};

export const isAnalyticsTrackingEnabled = () => analyticsEnabled;

export const trackAnalyticsEvent = (input: AnalyticsEventInput) => {
    enqueueEvent(input);
};

export const trackPageView = (pageUrl?: string) => {
    if (!analyticsEnabled) {
        return;
    }

    const resolvedUrl = buildPageUrl(pageUrl);
    enqueueEvent({
        type: "page_view",
        pageUrl: resolvedUrl,
        referrerUrl: resolveReferrer(undefined),
    });
    lastTrackedPageUrl = resolvedUrl;
};

export const resetAnalyticsReferrer = () => {
    lastTrackedPageUrl = null;
};
