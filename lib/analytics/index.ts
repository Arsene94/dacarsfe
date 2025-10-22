import { TIMEZONE_COUNTRY_MAP } from "./timezones";
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

const TIMEZONE_COUNTRY_LOOKUP: Record<string, string> = TIMEZONE_COUNTRY_MAP;

const isBrowser = () => typeof window !== "undefined";

const queue: AnalyticsQueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let analyticsEnabled = false;
let inMemoryVisitorUuid: string | null = null;
let inMemorySessionUuid: string | null = null;
let lastTrackedPageUrl: string | null = null;
let cachedVisitorCountry: string | null | undefined;

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

const ISO_COUNTRY_CODES = new Set<string>([
    "AD",
    "AE",
    "AF",
    "AG",
    "AI",
    "AL",
    "AM",
    "AO",
    "AQ",
    "AR",
    "AS",
    "AT",
    "AU",
    "AW",
    "AX",
    "AZ",
    "BA",
    "BB",
    "BD",
    "BE",
    "BF",
    "BG",
    "BH",
    "BI",
    "BJ",
    "BL",
    "BM",
    "BN",
    "BO",
    "BQ",
    "BR",
    "BS",
    "BT",
    "BV",
    "BW",
    "BY",
    "BZ",
    "CA",
    "CC",
    "CD",
    "CF",
    "CG",
    "CH",
    "CI",
    "CK",
    "CL",
    "CM",
    "CN",
    "CO",
    "CR",
    "CU",
    "CV",
    "CW",
    "CX",
    "CY",
    "CZ",
    "DE",
    "DJ",
    "DK",
    "DM",
    "DO",
    "DZ",
    "EC",
    "EE",
    "EG",
    "EH",
    "ER",
    "ES",
    "ET",
    "FI",
    "FJ",
    "FK",
    "FM",
    "FO",
    "FR",
    "GA",
    "GB",
    "GD",
    "GE",
    "GF",
    "GG",
    "GH",
    "GI",
    "GL",
    "GM",
    "GN",
    "GP",
    "GQ",
    "GR",
    "GS",
    "GT",
    "GU",
    "GW",
    "GY",
    "HK",
    "HM",
    "HN",
    "HR",
    "HT",
    "HU",
    "ID",
    "IE",
    "IL",
    "IM",
    "IN",
    "IO",
    "IQ",
    "IR",
    "IS",
    "IT",
    "JE",
    "JM",
    "JO",
    "JP",
    "KE",
    "KG",
    "KH",
    "KI",
    "KM",
    "KN",
    "KP",
    "KR",
    "KW",
    "KY",
    "KZ",
    "LA",
    "LB",
    "LC",
    "LI",
    "LK",
    "LR",
    "LS",
    "LT",
    "LU",
    "LV",
    "LY",
    "MA",
    "MC",
    "MD",
    "ME",
    "MF",
    "MG",
    "MH",
    "MK",
    "ML",
    "MM",
    "MN",
    "MO",
    "MP",
    "MQ",
    "MR",
    "MS",
    "MT",
    "MU",
    "MV",
    "MW",
    "MX",
    "MY",
    "MZ",
    "NA",
    "NC",
    "NE",
    "NF",
    "NG",
    "NI",
    "NL",
    "NO",
    "NP",
    "NR",
    "NU",
    "NZ",
    "OM",
    "PA",
    "PE",
    "PF",
    "PG",
    "PH",
    "PK",
    "PL",
    "PM",
    "PN",
    "PR",
    "PS",
    "PT",
    "PW",
    "PY",
    "QA",
    "RE",
    "RO",
    "RS",
    "RU",
    "RW",
    "SA",
    "SB",
    "SC",
    "SD",
    "SE",
    "SG",
    "SH",
    "SI",
    "SJ",
    "SK",
    "SL",
    "SM",
    "SN",
    "SO",
    "SR",
    "SS",
    "ST",
    "SV",
    "SX",
    "SY",
    "SZ",
    "TC",
    "TD",
    "TF",
    "TG",
    "TH",
    "TJ",
    "TK",
    "TL",
    "TM",
    "TN",
    "TO",
    "TR",
    "TT",
    "TV",
    "TW",
    "TZ",
    "UA",
    "UG",
    "UM",
    "US",
    "UY",
    "UZ",
    "VA",
    "VC",
    "VE",
    "VG",
    "VI",
    "VN",
    "VU",
    "WF",
    "WS",
    "YE",
    "YT",
    "ZA",
    "ZM",
    "ZW",
    "XK",
]);

const extractCountryFromLocale = (locale: string): string | null => {
    if (!locale || typeof locale !== "string") {
        return null;
    }

    const trimmed = locale.trim();
    if (trimmed.length === 0) {
        return null;
    }

    try {
        const LocaleCtor = (Intl as unknown as { Locale?: typeof Intl.Locale }).Locale;
        if (typeof LocaleCtor === "function") {
            const parsedLocale = new LocaleCtor(trimmed);
            if (parsedLocale) {
                if (parsedLocale.region) {
                    const region = String(parsedLocale.region).toUpperCase();
                    if (ISO_COUNTRY_CODES.has(region)) {
                        return region;
                    }
                }

                const maximized = typeof parsedLocale.maximize === "function" ? parsedLocale.maximize() : null;
                if (maximized && maximized.region) {
                    const region = String(maximized.region).toUpperCase();
                    if (ISO_COUNTRY_CODES.has(region)) {
                        return region;
                    }
                }
            }
        }
    } catch (error) {
        // Ignorăm erorile provenite din locale invalide
    }

    const normalized = trimmed.replace(/_/g, "-");
    const segments = normalized.split("-");
    for (const segment of segments.slice(1)) {
        if (/^[A-Za-z]{2}$/.test(segment)) {
            const upper = segment.toUpperCase();
            if (ISO_COUNTRY_CODES.has(upper)) {
                return upper;
            }
        }
        if (/^[0-9]{3}$/.test(segment)) {
            return segment;
        }
    }

    return null;
};

const normalizeCountryInput = (value?: string | null): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return null;
    }

    const localeCandidate = extractCountryFromLocale(trimmed);
    if (localeCandidate) {
        return localeCandidate;
    }

    if (trimmed.length === 2) {
        const upper = trimmed.toUpperCase();
        if (ISO_COUNTRY_CODES.has(upper)) {
            return upper;
        }
    }

    if (trimmed.length === 3 && /^[0-9]{3}$/.test(trimmed)) {
        return trimmed;
    }

    if (trimmed.length === 3 && /^[A-Za-z]{3}$/.test(trimmed)) {
        return trimmed.toUpperCase();
    }

    return trimmed;
};

const resolveCountryFromTimezone = (timeZone?: string | null): string | null => {
    if (typeof timeZone !== "string") {
        return null;
    }

    const trimmed = timeZone.trim();
    if (trimmed.length === 0) {
        return null;
    }

    const direct = TIMEZONE_COUNTRY_LOOKUP[trimmed];
    if (direct) {
        return direct;
    }

    const normalized = trimmed.replace(/\s+/g, "_");
    if (normalized !== trimmed) {
        const normalizedMatch = TIMEZONE_COUNTRY_LOOKUP[normalized];
        if (normalizedMatch) {
            return normalizedMatch;
        }
    }

    const upper = trimmed.toUpperCase();
    if (upper !== trimmed) {
        const upperMatch = TIMEZONE_COUNTRY_LOOKUP[upper];
        if (upperMatch) {
            return upperMatch;
        }
    }

    return null;
};

const detectBrowserCountry = (): string | null => {
    if (!isBrowser() || typeof navigator === "undefined") {
        return null;
    }

    const candidates = new Set<string>();
    const pushCandidate = (candidate?: string | null) => {
        if (typeof candidate !== "string") {
            return;
        }
        const trimmed = candidate.trim();
        if (trimmed.length > 0) {
            candidates.add(trimmed);
        }
    };

    try {
        const options = Intl.DateTimeFormat().resolvedOptions();
        if (options?.timeZone) {
            const timeZoneCountry = resolveCountryFromTimezone(options.timeZone);
            if (timeZoneCountry) {
                pushCandidate(timeZoneCountry);
            }
            pushCandidate(options.timeZone);
        }

        if (typeof options?.locale === "string") {
            pushCandidate(options.locale);
        }
    } catch (error) {
        // Ignorăm erorile generate de browsere fără Intl complet
    }

    const nav = navigator as Navigator & {
        language?: string;
        languages?: string[];
        userLanguage?: string;
        browserLanguage?: string;
    };

    pushCandidate(nav.language);
    if (Array.isArray(nav.languages)) {
        nav.languages.forEach((lang) => pushCandidate(lang));
    }
    pushCandidate((nav as Record<string, unknown>).userLanguage as string | undefined);
    pushCandidate((nav as Record<string, unknown>).browserLanguage as string | undefined);

    for (const candidate of candidates) {
        const normalized = normalizeCountryInput(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return null;
};

const getVisitorCountry = (candidate?: string | null): string | null => {
    const explicit = normalizeCountryInput(candidate);
    if (explicit) {
        return explicit;
    }

    if (cachedVisitorCountry !== undefined) {
        return cachedVisitorCountry;
    }

    cachedVisitorCountry = detectBrowserCountry();
    return cachedVisitorCountry;
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

    const eventCountry = getVisitorCountry(payload.country ?? null);
    if (eventCountry) {
        event.country = eventCountry;
    }

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

    const payload: {
        visitor_uuid: string;
        session_uuid: string;
        events: AnalyticsQueuedEvent[];
        country?: string;
    } = {
        visitor_uuid: visitorUuid,
        session_uuid: sessionUuid,
        events,
    };

    const batchCountry = getVisitorCountry(null);
    if (batchCountry) {
        payload.country = batchCountry;
    }

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
    getVisitorCountry(null);
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
