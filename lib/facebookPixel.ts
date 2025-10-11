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
    ge?: string;
    db?: string;
    ct?: string;
    st?: string;
    zp?: string;
    country?: string;
    external_id?: string;
};

type ReactFacebookPixel = typeof import("react-facebook-pixel").default;

let loadedPixel: ReactFacebookPixel | null = null;
let loadPixelPromise: Promise<ReactFacebookPixel | null> | null = null;
let initialized = false;
let advancedMatching: AdvancedMatchingPayload = {};

const canUsePixel = () => Boolean(isBrowser && PIXEL_ID);

const loadPixel = async (): Promise<ReactFacebookPixel | null> => {
    if (!isBrowser) {
        return null;
    }

    if (loadedPixel) {
        return loadedPixel;
    }

    if (!loadPixelPromise) {
        loadPixelPromise = import("react-facebook-pixel")
            .then((module) => {
                loadedPixel = module.default;
                return loadedPixel;
            })
            .catch((error) => {
                if (process.env.NODE_ENV !== "production") {
                    console.error("Nu s-a putut încărca react-facebook-pixel", error);
                }
                loadPixelPromise = null;
                return null;
            });
    }

    return loadPixelPromise;
};

const ensurePixelReady = async (): Promise<ReactFacebookPixel | null> => {
    if (!canUsePixel()) {
        return null;
    }

    const pixel = await loadPixel();
    if (!pixel) {
        return null;
    }

    if (!initialized) {
        pixel.init(PIXEL_ID!, advancedMatching, pixelOptions);
        initialized = true;
    }

    return pixel;
};

type FacebookQueueFunction = ((...args: unknown[]) => void) | undefined;

const resolveFacebookQueue = (
    pixel: ReactFacebookPixel | null,
): FacebookQueueFunction => {
    const fbqFromPixel = (pixel as unknown as { fbq?: FacebookQueueFunction } | null)?.fbq;
    if (typeof fbqFromPixel === "function") {
        return fbqFromPixel;
    }

    if (typeof window === "undefined") {
        return undefined;
    }

    const fbqFromWindow = (window as typeof window & { fbq?: FacebookQueueFunction }).fbq;
    return typeof fbqFromWindow === "function" ? fbqFromWindow : undefined;
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

    if (["f", "female", "feminin", "femeie", "doamna", "doamnă"].includes(normalized)) {
        return "f";
    }

    return undefined;
};

const normalizeDateOfBirth = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const normalized = trimmed.replace(/[^0-9]/g, "");
    if (normalized.length === 8) {
        const [year, month, day] = [
            normalized.slice(0, 4),
            normalized.slice(4, 6),
            normalized.slice(6, 8),
        ];
        if (Number.isFinite(Number(year)) && Number.isFinite(Number(month)) && Number.isFinite(Number(day))) {
            return `${year}${month}${day}`;
        }
    }

    if (normalized.length === 6) {
        const [day, month, yearSuffix] = [
            normalized.slice(0, 2),
            normalized.slice(2, 4),
            normalized.slice(4, 6),
        ];
        const inferredYear = Number(yearSuffix);
        if (Number.isFinite(Number(day)) && Number.isFinite(Number(month)) && Number.isFinite(inferredYear)) {
            const century = inferredYear > 30 ? "19" : "20";
            return `${century}${yearSuffix}${month}${day}`;
        }
    }

    return undefined;
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
    VIEW_CONTENT: "ViewContent",
    SEARCH: "Search",
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
    gender?: string | null;
    dateOfBirth?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    externalId?: string | number | null;
};

export const initFacebookPixel = () => {
    void ensurePixelReady();
};

export const isFacebookPixelConfigured = () => canUsePixel();

export const trackFacebookPixelPageView = () => {
    void ensurePixelReady().then((pixel) => {
        pixel?.pageView();
    });
};

export const trackFacebookPixelEvent = (
    eventName: FacebookPixelEventName,
    data?: Record<string, unknown>,
) => {
    void ensurePixelReady().then((pixel) => {
        pixel?.track(eventName, data);
    });
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

    if ("gender" in update) {
        changed = assignAdvancedMatchingValue("ge", normalizeGender(update.gender ?? undefined), draft) || changed;
    }

    if ("dateOfBirth" in update) {
        changed = assignAdvancedMatchingValue(
            "db",
            normalizeDateOfBirth(update.dateOfBirth ?? undefined),
            draft,
        ) || changed;
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

    if (!initialized) {
        return;
    }

    void ensurePixelReady().then((pixel) => {
        const fbq = resolveFacebookQueue(pixel);
        if (!fbq) {
            return;
        }

        fbq("set", "userData", { ...advancedMatching });
    });
};
