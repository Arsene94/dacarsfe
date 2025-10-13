export type TikTokQueue = {
    identify?: (payload: Record<string, unknown>) => void;
    track?: (event: string, payload?: Record<string, unknown>) => void;
};

declare global {
    interface Window {
        ttq?: TikTokQueue;
    }
}

const isBrowser = typeof window !== "undefined";

export const resolveTikTokQueue = (): TikTokQueue | null => {
    if (!isBrowser) {
        return null;
    }

    return window.ttq ?? null;
};

const dispatchTikTokEvent = (
    event: string,
    payload?: Record<string, unknown>,
): boolean => {
    const queue = resolveTikTokQueue();
    if (!queue || typeof queue.track !== "function") {
        return false;
    }

    queue.track(event, payload);
    return true;
};

export type TikTokEventContent = {
    content_id: string;
    content_type: string;
    content_name?: string;
};

export type TikTokBaseEventPayload = {
    contents?: TikTokEventContent[];
    value?: number;
    currency?: string;
};

export type TikTokSearchEventPayload = TikTokBaseEventPayload & {
    search_string?: string;
};

export const trackTikTokViewContent = (payload: TikTokBaseEventPayload): boolean => {
    if (payload.contents?.length === 0) {
        delete payload.contents;
    }

    return dispatchTikTokEvent("ViewContent", payload);
};

export const trackTikTokSearch = (payload: TikTokSearchEventPayload): boolean => {
    if (payload.contents?.length === 0) {
        delete payload.contents;
    }

    return dispatchTikTokEvent("Search", payload);
};

export const trackTikTokLead = (payload: TikTokBaseEventPayload): boolean => {
    if (payload.contents?.length === 0) {
        delete payload.contents;
    }

    return dispatchTikTokEvent("Lead", payload);
};

export type TikTokIdentifyPayload = {
    email?: string;
    phone_number?: string;
    external_id?: string;
};

export const identifyTikTokUser = (payload: TikTokIdentifyPayload): boolean => {
    const queue = resolveTikTokQueue();
    if (!queue || typeof queue.identify !== "function") {
        return false;
    }

    if (!payload.email && !payload.phone_number && !payload.external_id) {
        return false;
    }

    queue.identify(payload);
    return true;
};

const resolveSubtleCrypto = (): SubtleCrypto | null => {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
        return window.crypto.subtle;
    }

    if (typeof globalThis !== "undefined") {
        const cryptoLike = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
        if (cryptoLike?.subtle) {
            return cryptoLike.subtle;
        }
    }

    return null;
};

const sha256Hex = async (value: string): Promise<string | null> => {
    if (!value) {
        return null;
    }

    const subtle = resolveSubtleCrypto();
    if (!subtle) {
        return null;
    }

    const encoded = new TextEncoder().encode(value);
    const digest = await subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
};

export const hashTikTokEmail = async (value: unknown): Promise<string | null> => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    return sha256Hex(normalized);
};

export const hashTikTokPhone = async (value: unknown): Promise<string | null> => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.replace(/[^0-9+]/g, "");
    if (!normalized) {
        return null;
    }

    return sha256Hex(normalized);
};

export const hashTikTokExternalId = async (value: unknown): Promise<string | null> => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return sha256Hex(String(value));
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (!normalized) {
            return null;
        }

        return sha256Hex(normalized);
    }

    return null;
};

export const hasTikTokQueue = (): boolean => {
    const queue = resolveTikTokQueue();
    return !!queue && typeof queue.track === "function";
};
