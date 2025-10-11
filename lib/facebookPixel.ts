import { FacebookPixel, TrackableEventNameEnum, type TrackableEventName, type EventData, type AdditionalEventData, type InitProps } from "react-use-facebook-pixel";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const isBrowser = typeof window !== "undefined";

let pixelInstance: FacebookPixel | null = null;
let advancedMatching: InitProps = {};
let lastAdvancedMatchingSignature: string | null = null;

const createPixelInstance = (): FacebookPixel | null => {
    if (!isBrowser) {
        return null;
    }

    if (!PIXEL_ID) {
        return null;
    }

    if (!pixelInstance) {
        pixelInstance = new FacebookPixel({
            pixelID: PIXEL_ID,
            autoConfig: false,
            debug: process.env.NODE_ENV !== "production",
            pageViewOnInit: false,
        });
    }

    return pixelInstance;
};

const applyAdvancedMatching = (): FacebookPixel | null => {
    const pixel = createPixelInstance();
    if (!pixel) {
        return null;
    }

    const signature = JSON.stringify(advancedMatching);
    if (signature !== lastAdvancedMatchingSignature) {
        pixel.init(advancedMatching);
        lastAdvancedMatchingSignature = signature;
    }

    return pixel;
};

const sanitizeEmail = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
};

const extractDigits = (value: unknown): string | undefined => {
    if (typeof value === "string" || typeof value === "number") {
        const digits = String(value).replace(/\D+/g, "");
        return digits.length > 0 ? digits : undefined;
    }

    return undefined;
};

const sanitizePhone = (value: unknown): number | undefined => {
    const digits = extractDigits(value);
    if (!digits) {
        return undefined;
    }

    const numericValue = Number(digits);
    return Number.isFinite(numericValue) ? numericValue : undefined;
};

const sanitizeName = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
};

const splitFullName = (
    value: unknown,
): { firstName?: string; lastName?: string } => {
    const normalized = sanitizeName(value);
    if (!normalized) {
        return {};
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return {};
    }

    const [firstName, ...rest] = parts;
    const lastName = rest.length > 0 ? rest[rest.length - 1] : undefined;
    return { firstName, lastName };
};

const sanitizeCity = (value: unknown): string | undefined => {
    const normalized = sanitizeName(value);
    if (!normalized) {
        return undefined;
    }

    return normalized.replace(/\s+/g, "");
};

const sanitizeState = (value: unknown): string | undefined => {
    const normalized = sanitizeName(value);
    if (!normalized) {
        return undefined;
    }

    const condensed = normalized.replace(/\s+/g, "");
    return condensed.length > 2 ? condensed.slice(0, 2) : condensed;
};

const sanitizeCountry = (value: unknown): string | undefined => {
    const normalized = sanitizeName(value);
    if (!normalized) {
        return undefined;
    }

    const condensed = normalized.replace(/\s+/g, "");
    return condensed.length > 2 ? condensed.slice(0, 2) : condensed;
};

const sanitizePostalCode = (value: unknown): string | undefined => {
    if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized.toLowerCase() : undefined;
};

const sanitizeExternalId = (value: unknown): string | undefined => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : undefined;
    }

    return undefined;
};

export const FACEBOOK_PIXEL_EVENTS = {
    PAGE_VIEW: TrackableEventNameEnum.PageView,
    LEAD: TrackableEventNameEnum.Lead,
} as const;

export type FacebookPixelEventName = (typeof FACEBOOK_PIXEL_EVENTS)[keyof typeof FACEBOOK_PIXEL_EVENTS] | TrackableEventName;

export type FacebookPixelAdvancedMatchingUpdate = {
    email?: string | null;
    phone?: string | null;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    externalId?: string | number | null;
};

export const isFacebookPixelConfigured = () => Boolean(PIXEL_ID);

export const initFacebookPixel = () => {
    applyAdvancedMatching();
};

export const updateFacebookPixelAdvancedMatching = (update: FacebookPixelAdvancedMatchingUpdate) => {
    if (!isBrowser) {
        return;
    }

    const next: InitProps = { ...advancedMatching };

    const assign = <K extends keyof InitProps>(key: K, value: InitProps[K] | undefined) => {
        if (value === undefined || value === null || value === "" || (typeof value === "number" && Number.isNaN(value))) {
            delete next[key];
            return;
        }

        next[key] = value;
    };

    if (Object.prototype.hasOwnProperty.call(update, "email")) {
        assign("em", sanitizeEmail(update.email ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "phone")) {
        assign("ph", sanitizePhone(update.phone ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "firstName")) {
        assign("fn", sanitizeName(update.firstName ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "lastName")) {
        assign("ln", sanitizeName(update.lastName ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "fullName")) {
        const { firstName, lastName } = splitFullName(update.fullName);
        if (firstName && !next.fn) {
            assign("fn", firstName);
        }
        if (lastName && !next.ln) {
            assign("ln", lastName);
        }
    }

    if (Object.prototype.hasOwnProperty.call(update, "city")) {
        assign("ct", sanitizeCity(update.city ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "state")) {
        assign("st", sanitizeState(update.state ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "postalCode")) {
        assign("zp", sanitizePostalCode(update.postalCode ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "country")) {
        assign("country", sanitizeCountry(update.country ?? undefined));
    }

    if (Object.prototype.hasOwnProperty.call(update, "externalId")) {
        assign("external_id", sanitizeExternalId(update.externalId ?? undefined));
    }

    advancedMatching = next;
    applyAdvancedMatching();
};

export const trackFacebookPixelEvent = <K extends TrackableEventName>(
    eventName: K,
    data?: EventData[K],
    additionalData?: AdditionalEventData,
) => {
    const pixel = applyAdvancedMatching();
    pixel?.trackEvent(eventName, data, additionalData);
};

export const trackFacebookPixelPageView = (data?: EventData[TrackableEventNameEnum.PageView]) => {
    trackFacebookPixelEvent(TrackableEventNameEnum.PageView, data);
};
