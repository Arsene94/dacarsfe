import { getBrowserCookieValue } from "@/lib/browserCookies";

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim();
const META_PIXEL_CLICK_ID_COOKIE_NAME = "_fbc";
const FACEBOOK_LOGIN_ID_COOKIE_NAME = "fb_login_id";
const FACEBOOK_LOGIN_ID_COOKIE_PREFIX = "fblo_";
const FACEBOOK_LOGIN_ID_STORAGE_KEYS = [
    "fb_login_id",
    "_fb_login_id",
    "fbLoginId",
    "facebook_login_id",
] as const;

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
    zp?: string | number;
    country?: string;
    ge?: string;
    db?: string | number | Date;
};

type NameParts = {
    firstName?: string;
    lastName?: string;
};

let advancedMatchingCache: AdvancedMatchingPayload = {};
let cachedFacebookLoginId: string | null = null;

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

const formatDateAsYYYYMMDD = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}${month}${day}`;
};

const normalizeDateOfBirth = (value: unknown): string | undefined => {
    const toDate = (candidate: unknown): Date | null => {
        if (candidate instanceof Date) {
            return Number.isNaN(candidate.getTime()) ? null : candidate;
        }

        if (typeof candidate === "number" && Number.isFinite(candidate)) {
            const fromNumber = new Date(candidate);
            return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
        }

        if (typeof candidate !== "string") {
            return null;
        }

        const trimmed = candidate.trim();
        if (!trimmed) {
            return null;
        }

        const directParsed = Date.parse(trimmed);
        if (!Number.isNaN(directParsed)) {
            const directDate = new Date(directParsed);
            return Number.isNaN(directDate.getTime()) ? null : directDate;
        }

        const digitsOnly = trimmed.replace(/\D+/g, "");
        if (digitsOnly.length === 8) {
            const yearFirstCandidate = `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
            const yearFirstParsed = Date.parse(yearFirstCandidate);
            if (!Number.isNaN(yearFirstParsed)) {
                const yearFirstDate = new Date(yearFirstParsed);
                if (!Number.isNaN(yearFirstDate.getTime())) {
                    return yearFirstDate;
                }
            }

            const dayFirstCandidate = `${digitsOnly.slice(4, 8)}-${digitsOnly.slice(2, 4)}-${digitsOnly.slice(0, 2)}`;
            const dayFirstParsed = Date.parse(dayFirstCandidate);
            if (!Number.isNaN(dayFirstParsed)) {
                const dayFirstDate = new Date(dayFirstParsed);
                if (!Number.isNaN(dayFirstDate.getTime())) {
                    return dayFirstDate;
                }
            }
        }

        return null;
    };

    const resolvedDate = toDate(value);
    if (!resolvedDate) {
        return undefined;
    }

    return formatDateAsYYYYMMDD(resolvedDate);
};

const normalizeGender = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    if (["m", "male", "masculin", "bărbat", "barbat"].includes(normalized)) {
        return "m";
    }

    if (["f", "female", "feminin", "femeie"].includes(normalized)) {
        return "f";
    }

    return undefined;
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

    const gender = normalizeGender(raw.ge);
    if (gender) {
        sanitized.ge = gender;
    }

    const dateOfBirth = normalizeDateOfBirth(raw.db);
    if (dateOfBirth) {
        sanitized.db = dateOfBirth;
    }

    return sanitized;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object";

const META_CUSTOMER_DETAIL_KEYS = [
    "customer",
    "customer_details",
    "customer_detail",
    "customerdata",
    "customer_data",
    "customerinfo",
    "customer_info",
    "customerprofile",
    "customer_profile",
    "profile",
    "user",
    "contact",
    "contacts",
    "address",
    "addresses",
    "billing_address",
    "billingaddress",
    "shipping_address",
    "shippingaddress",
] as const;

const toLowerCaseKey = (key: string): string => key.trim().toLowerCase();

const pickRecordValue = (
    record: Record<string, unknown>,
    candidateKeys: string[],
): unknown => {
    if (candidateKeys.length === 0) {
        return undefined;
    }

    const entries = Object.entries(record);
    for (const key of candidateKeys) {
        const normalizedKey = toLowerCaseKey(key);
        for (const [entryKey, value] of entries) {
            if (toLowerCaseKey(entryKey) === normalizedKey) {
                if (value !== undefined && value !== null) {
                    if (typeof value === "string") {
                        const trimmed = value.trim();
                        if (trimmed.length === 0) {
                            continue;
                        }
                    }
                    return value;
                }
            }
        }
    }

    return undefined;
};

const collectCandidateRecords = (
    source: unknown,
    visited: Set<Record<string, unknown>> = new Set(),
): Record<string, unknown>[] => {
    if (!isRecord(source)) {
        return [];
    }

    const queue: Record<string, unknown>[] = [source];
    const records: Record<string, unknown>[] = [];

    while (queue.length > 0) {
        const record = queue.shift();
        if (!record || visited.has(record)) {
            continue;
        }

        visited.add(record);
        records.push(record);

        for (const key of META_CUSTOMER_DETAIL_KEYS) {
            const nested = pickRecordValue(record, [key]);
            if (!nested) {
                continue;
            }

            if (isRecord(nested)) {
                queue.push(nested);
                continue;
            }

            if (Array.isArray(nested)) {
                nested.forEach((entry) => {
                    if (isRecord(entry)) {
                        queue.push(entry);
                    }
                });
            }
        }
    }

    return records;
};

const resolveValueFromSources = (
    sources: Array<unknown>,
    candidateKeys: string[],
): unknown => {
    if (candidateKeys.length === 0 || sources.length === 0) {
        return undefined;
    }

    const visited = new Set<Record<string, unknown>>();
    for (const source of sources) {
        const records = collectCandidateRecords(source, visited);
        for (const record of records) {
            const value = pickRecordValue(record, candidateKeys);
            if (value !== undefined) {
                return value;
            }
        }
    }

    return undefined;
};

export const buildMetaPixelAdvancedMatchingFromCustomer = (
    ...sources: Array<unknown>
): AdvancedMatchingPayload => {
    const filteredSources = sources.filter(Boolean);

    const firstNameCandidate = resolveValueFromSources(filteredSources, [
        "customer_first_name",
        "customerfirstname",
        "customer_firstname",
        "first_name",
        "firstname",
        "given_name",
        "givenname",
        "prename",
        "forename",
    ]);

    const lastNameCandidate = resolveValueFromSources(filteredSources, [
        "customer_last_name",
        "customerlastname",
        "customer_lastname",
        "last_name",
        "lastname",
        "surname",
        "family_name",
        "familyname",
        "second_name",
    ]);

    const fullNameCandidate = resolveValueFromSources(filteredSources, [
        "customer_name",
        "name",
        "full_name",
        "fullname",
        "display_name",
        "displayname",
    ]);

    const { firstName: parsedFirstName, lastName: parsedLastName } =
        resolveMetaPixelNameParts(fullNameCandidate);

    const payload: AdvancedMatchingPayload = {};

    const firstName =
        (typeof firstNameCandidate === "string" && firstNameCandidate.trim().length > 0
            ? firstNameCandidate
            : undefined) || parsedFirstName;
    if (firstName) {
        payload.fn = firstName;
    }

    const lastName =
        (typeof lastNameCandidate === "string" && lastNameCandidate.trim().length > 0
            ? lastNameCandidate
            : undefined) || parsedLastName;
    if (lastName) {
        payload.ln = lastName;
    }

    const cityCandidate = resolveValueFromSources(filteredSources, [
        "customer_city",
        "customer_city_name",
        "customer_cityname",
        "customercity",
        "city_name",
        "city",
        "customer_town",
        "customertown",
        "town",
        "locality",
        "municipality",
    ]);
    if (cityCandidate !== undefined) {
        payload.ct = typeof cityCandidate === "string" ? cityCandidate : String(cityCandidate);
    }

    const regionCandidate = resolveValueFromSources(filteredSources, [
        "customer_region",
        "customerregion",
        "region",
        "customer_county",
        "customercounty",
        "county",
        "state",
        "province",
        "state_region",
        "state_province",
    ]);
    if (regionCandidate !== undefined) {
        payload.st =
            typeof regionCandidate === "string" ? regionCandidate : String(regionCandidate);
    }

    const countryCandidate = resolveValueFromSources(filteredSources, [
        "customer_country",
        "customercountry",
        "country",
    ]);
    if (countryCandidate !== undefined) {
        payload.country =
            typeof countryCandidate === "string" ? countryCandidate : String(countryCandidate);
    }

    const postalCandidate = resolveValueFromSources(filteredSources, [
        "customer_postcode",
        "customerpostcode",
        "postcode",
        "postal_code",
        "postalcode",
        "zipcode",
        "zip_code",
        "zip",
    ]);
    if (postalCandidate !== undefined) {
        payload.zp =
            typeof postalCandidate === "string" || typeof postalCandidate === "number"
                ? (postalCandidate as string | number)
                : String(postalCandidate);
    }

    const genderCandidate = resolveValueFromSources(filteredSources, [
        "customer_gender",
        "customergender",
        "gender",
        "sex",
    ]);
    if (genderCandidate !== undefined) {
        payload.ge =
            typeof genderCandidate === "string"
                ? genderCandidate
                : String(genderCandidate);
    }

    const dateOfBirthCandidate = resolveValueFromSources(filteredSources, [
        "customer_date_of_birth",
        "customerdateofbirth",
        "customerdob",
        "date_of_birth",
        "dateofbirth",
        "birth_date",
        "birthdate",
        "dob",
        "birthday",
    ]);
    if (dateOfBirthCandidate !== undefined) {
        payload.db =
            dateOfBirthCandidate instanceof Date ||
            typeof dateOfBirthCandidate === "string" ||
            typeof dateOfBirthCandidate === "number"
                ? (dateOfBirthCandidate as string | number | Date)
                : String(dateOfBirthCandidate);
    }

    return payload;
};

const mergeAdvancedMatching = (
    current: AdvancedMatchingPayload,
    incoming: AdvancedMatchingPayload,
): AdvancedMatchingPayload => {
    const merged: AdvancedMatchingPayload = { ...current };

    const assignValue = <K extends keyof AdvancedMatchingPayload>(key: K) => {
        const value = incoming[key];

        if (value === undefined || value === null) {
            return;
        }

        if (typeof value === "string" && value.trim().length === 0) {
            return;
        }

        merged[key] = value;
    };

    assignValue("em");
    assignValue("ph");
    assignValue("fn");
    assignValue("ln");
    assignValue("external_id");
    assignValue("ct");
    assignValue("st");
    assignValue("zp");
    assignValue("country");
    assignValue("ge");
    assignValue("db");

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

const normalizeFacebookLoginId = (value: unknown): string | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
        const normalized = Math.abs(Math.trunc(value));
        return normalized ? String(normalized) : undefined;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return undefined;
        }

        const match = trimmed.match(/\d{5,}/);
        return match ? match[0] : undefined;
    }

    if (Array.isArray(value)) {
        for (const entry of value) {
            const candidate = normalizeFacebookLoginId(entry);
            if (candidate) {
                return candidate;
            }
        }
        return undefined;
    }

    if (value && typeof value === "object") {
        const candidateKeys = ["fb_login_id", "login_id", "user_id", "userID", "uid", "id"] as const;

        for (const key of candidateKeys) {
            if (key in (value as Record<string, unknown>)) {
                const candidate = normalizeFacebookLoginId(
                    (value as Record<string, unknown>)[key],
                );
                if (candidate) {
                    return candidate;
                }
            }
        }
    }

    return undefined;
};

const decodeUriComponentSafely = (value: string): string | undefined => {
    try {
        const decoded = decodeURIComponent(value);
        return decoded !== value ? decoded : undefined;
    } catch {
        return undefined;
    }
};

const tryParseJson = (value: string): unknown => {
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
};

const resolveFacebookLoginIdFromSerialized = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const directCandidate = normalizeFacebookLoginId(trimmed);
    if (directCandidate) {
        return directCandidate;
    }

    const decoded = decodeUriComponentSafely(trimmed);
    if (decoded) {
        const decodedCandidate = normalizeFacebookLoginId(decoded);
        if (decodedCandidate) {
            return decodedCandidate;
        }

        const parsedDecoded = tryParseJson(decoded);
        const parsedDecodedCandidate = normalizeFacebookLoginId(parsedDecoded);
        if (parsedDecodedCandidate) {
            return parsedDecodedCandidate;
        }
    }

    const parsed = tryParseJson(trimmed);
    const parsedCandidate = normalizeFacebookLoginId(parsed);
    if (parsedCandidate) {
        return parsedCandidate;
    }

    return undefined;
};

const getFacebookLoginIdFromStorage = (storage: Storage | null | undefined): string | null => {
    if (!storage) {
        return null;
    }

    for (const key of FACEBOOK_LOGIN_ID_STORAGE_KEYS) {
        try {
            const storedValue = storage.getItem(key);
            if (!storedValue) {
                continue;
            }

            const candidate = resolveFacebookLoginIdFromSerialized(storedValue);
            if (candidate) {
                return candidate;
            }
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.warn(
                    "Nu s-a putut citi Facebook Login ID din stocare",
                    key,
                    error,
                );
            }
        }
    }

    return null;
};

const getFacebookLoginIdFromCookies = (): string | null => {
    if (typeof document === "undefined") {
        return null;
    }

    const cookieCandidate = getBrowserCookieValue(FACEBOOK_LOGIN_ID_COOKIE_NAME);
    if (cookieCandidate) {
        const resolved = resolveFacebookLoginIdFromSerialized(cookieCandidate);
        if (resolved) {
            return resolved;
        }
    }

    const entries = document.cookie ? document.cookie.split(";") : [];

    for (const entry of entries) {
        const [rawName, ...rawValueParts] = entry.split("=");
        if (!rawName || rawValueParts.length === 0) {
            continue;
        }

        if (!rawName.trim().startsWith(FACEBOOK_LOGIN_ID_COOKIE_PREFIX)) {
            continue;
        }

        const rawValue = rawValueParts.join("=").trim();
        if (!rawValue) {
            continue;
        }

        const resolved = resolveFacebookLoginIdFromSerialized(rawValue);
        if (resolved) {
            return resolved;
        }
    }

    return null;
};

const resolveFacebookLoginId = (): string | null => {
    if (!isBrowser) {
        return null;
    }

    if (cachedFacebookLoginId) {
        return cachedFacebookLoginId;
    }

    const fbWindow = window as typeof window & {
        FB?: {
            getAuthResponse?: () => {
                userID?: string | number;
                userId?: string | number;
                uid?: string | number;
            } | null;
        };
    };

    const fb = fbWindow.FB;
    if (fb && typeof fb.getAuthResponse === "function") {
        try {
            const authResponse = fb.getAuthResponse();
            const candidate = normalizeFacebookLoginId(authResponse);
            if (candidate) {
                cachedFacebookLoginId = candidate;
                return cachedFacebookLoginId;
            }
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.warn("Nu s-a putut obține Facebook Login ID din SDK", error);
            }
        }
    }

    const fromCookies = getFacebookLoginIdFromCookies();
    if (fromCookies) {
        cachedFacebookLoginId = fromCookies;
        return cachedFacebookLoginId;
    }

    let fromLocalStorage: string | null = null;
    try {
        fromLocalStorage = getFacebookLoginIdFromStorage(window.localStorage);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Nu s-a putut accesa localStorage pentru Facebook Login ID", error);
        }
    }

    if (fromLocalStorage) {
        cachedFacebookLoginId = fromLocalStorage;
        return cachedFacebookLoginId;
    }

    let fromSessionStorage: string | null = null;
    try {
        fromSessionStorage = getFacebookLoginIdFromStorage(window.sessionStorage);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "Nu s-a putut accesa sessionStorage pentru Facebook Login ID",
                error,
            );
        }
    }

    if (fromSessionStorage) {
        cachedFacebookLoginId = fromSessionStorage;
        return cachedFacebookLoginId;
    }

    return null;
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

    const facebookLoginId = resolveFacebookLoginId();

    if (facebookLoginId) {
        const existingLoginId = (eventPayload as { fb_login_id?: unknown }).fb_login_id;
        const hasCustomLoginId =
            typeof existingLoginId === "string" && existingLoginId.trim().length > 0;

        if (!hasCustomLoginId) {
            (eventPayload as { fb_login_id?: string }).fb_login_id = facebookLoginId;
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

export type { AdvancedMatchingPayload };
