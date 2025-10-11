import ReactPixel from "react-facebook-pixel";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const isBrowser = typeof window !== "undefined";

const pixelOptions = {
    autoConfig: true,
    debug: process.env.NODE_ENV !== "production",
};

type AdvancedMatchingPayload = {
    em?: string;
    ph?: string;
    fn?: string;
    ln?: string;
    ct?: string;
    st?: string;
    zp?: string;
    country?: string;
    external_id?: string;
};

let initialized = false;
let advancedMatching: AdvancedMatchingPayload = {};

const canUsePixel = () => Boolean(isBrowser && PIXEL_ID);

const initPixel = () => {
    if (!canUsePixel()) {
        return false;
    }

    ReactPixel.init(PIXEL_ID!, advancedMatching, pixelOptions);
    initialized = true;
    return true;
};

const ensurePixelReady = () => {
    if (!initialized) {
        return initPixel();
    }

    return canUsePixel();
};

const normalizeEmail = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
};

const normalizeDigits = (value: unknown): string | undefined => {
    if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
    }

    const digits = String(value).replace(/\D+/g, "");
    return digits.length > 0 ? digits : undefined;
};

const normalizeName = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
};

const normalizeLocation = (value: unknown): string | undefined => {
    const normalized = normalizeName(value);
    return normalized?.replace(/\s+/g, "");
};

const normalizePostalCode = (value: unknown): string | undefined => {
    if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized.toLowerCase() : undefined;
};

const normalizeExternalId = (value: unknown): string | undefined => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return undefined;
};

const assignAdvancedMatchingValue = (
    key: keyof AdvancedMatchingPayload,
    value: string | undefined,
    draft: AdvancedMatchingPayload,
): boolean => {
    const current = draft[key];

    if (!value) {
        if (current) {
            delete draft[key];
            return true;
        }

        return false;
    }

    if (current === value) {
        return false;
    }

    draft[key] = value;
    return true;
};

const applyFullName = (
    value: unknown,
    draft: AdvancedMatchingPayload,
): boolean => {
    const normalized = normalizeName(value);
    if (!normalized) {
        let changed = false;
        changed = assignAdvancedMatchingValue("fn", undefined, draft) || changed;
        changed = assignAdvancedMatchingValue("ln", undefined, draft) || changed;
        return changed;
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return false;
    }

    const [first, ...rest] = parts;
    const last = rest.length > 0 ? rest[rest.length - 1] : undefined;
    let changed = false;
    changed = assignAdvancedMatchingValue("fn", first, draft) || changed;
    changed = assignAdvancedMatchingValue("ln", last, draft) || changed;
    return changed;
};

export const FACEBOOK_PIXEL_EVENTS = {
    PAGE_VIEW: "PageView",
    LEAD: "Lead",
} as const;

export type FacebookPixelEventName =
    (typeof FACEBOOK_PIXEL_EVENTS)[keyof typeof FACEBOOK_PIXEL_EVENTS] | string;

export type FacebookPixelAdvancedMatchingUpdate = {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    externalId?: string | number | null;
};

export const initFacebookPixel = () => {
    initPixel();
};

export const isFacebookPixelConfigured = () => canUsePixel();

export const trackFacebookPixelPageView = () => {
    if (!ensurePixelReady()) {
        return;
    }

    ReactPixel.pageView();
};

export const trackFacebookPixelEvent = (
    eventName: FacebookPixelEventName,
    data?: Record<string, unknown>,
) => {
    if (!ensurePixelReady()) {
        return;
    }

    ReactPixel.track(eventName, data);
};

export const updateFacebookPixelAdvancedMatching = (
    update: FacebookPixelAdvancedMatchingUpdate,
) => {
    const draft: AdvancedMatchingPayload = { ...advancedMatching };
    let changed = false;

    if ("email" in update) {
        changed = assignAdvancedMatchingValue("em", normalizeEmail(update.email ?? undefined), draft) || changed;
    }

    if ("phone" in update) {
        changed = assignAdvancedMatchingValue("ph", normalizeDigits(update.phone ?? undefined), draft) || changed;
    }

    if ("firstName" in update) {
        changed = assignAdvancedMatchingValue("fn", normalizeName(update.firstName ?? undefined), draft) || changed;
    }

    if ("lastName" in update) {
        changed = assignAdvancedMatchingValue("ln", normalizeName(update.lastName ?? undefined), draft) || changed;
    }

    if ("fullName" in update) {
        changed = applyFullName(update.fullName, draft) || changed;
    }

    if ("city" in update) {
        changed = assignAdvancedMatchingValue("ct", normalizeLocation(update.city ?? undefined), draft) || changed;
    }

    if ("state" in update) {
        changed = assignAdvancedMatchingValue("st", normalizeLocation(update.state ?? undefined), draft) || changed;
    }

    if ("postalCode" in update) {
        changed = assignAdvancedMatchingValue("zp", normalizePostalCode(update.postalCode ?? undefined), draft) || changed;
    }

    if ("country" in update) {
        changed = assignAdvancedMatchingValue("country", normalizeLocation(update.country ?? undefined), draft) || changed;
    }

    if ("externalId" in update) {
        changed = assignAdvancedMatchingValue(
            "external_id",
            normalizeExternalId(update.externalId ?? undefined),
            draft,
        ) || changed;
    }

    if (!changed) {
        return;
    }

    advancedMatching = draft;

    if (initialized) {
        initPixel();
    }
};
