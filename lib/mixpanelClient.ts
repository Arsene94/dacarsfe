import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let isInitialized = false;

const sanitizeMixpanelValue = (value: unknown): unknown => {
    if (value === undefined) {
        return undefined;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        const sanitizedArray = value
            .map((item) => sanitizeMixpanelValue(item))
            .filter((item): item is Exclude<unknown, undefined> => item !== undefined);

        return sanitizedArray;
    }

    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .map(([key, nested]) => {
                const sanitizedNested = sanitizeMixpanelValue(nested);

                if (sanitizedNested === undefined) {
                    return null;
                }

                if (
                    typeof sanitizedNested === "object" &&
                    sanitizedNested !== null &&
                    !Array.isArray(sanitizedNested) &&
                    Object.keys(sanitizedNested).length === 0
                ) {
                    return null;
                }

                if (Array.isArray(sanitizedNested) && sanitizedNested.length === 0) {
                    return [key, []];
                }

                return [key, sanitizedNested];
            })
            .filter((entry): entry is [string, unknown] => entry !== null);

        if (entries.length === 0) {
            return undefined;
        }

        return Object.fromEntries(entries);
    }

    if (typeof value === "number") {
        if (Number.isFinite(value)) {
            return value;
        }

        return null;
    }

    if (
        typeof value === "string" ||
        typeof value === "boolean" ||
        value === null
    ) {
        return value;
    }

    if (typeof value === "bigint") {
        const asNumber = Number(value);
        return Number.isFinite(asNumber) ? asNumber : value.toString();
    }

    if (typeof value === "symbol") {
        return value.toString();
    }

    if (typeof value === "function") {
        return undefined;
    }

    try {
        return String(value);
    } catch {
        return undefined;
    }
};

const sanitizeMixpanelProperties = (
    payload: Record<string, unknown>,
): Record<string, unknown> => {
    const sanitizedEntries: Array<[string, unknown]> = [];

    Object.entries(payload).forEach(([key, rawValue]) => {
        const sanitizedValue = sanitizeMixpanelValue(rawValue);

        if (sanitizedValue === undefined) {
            return;
        }

        if (
            typeof sanitizedValue === "object" &&
            sanitizedValue !== null &&
            !Array.isArray(sanitizedValue) &&
            Object.keys(sanitizedValue).length === 0
        ) {
            return;
        }

        sanitizedEntries.push([key, sanitizedValue]);
    });

    return Object.fromEntries(sanitizedEntries);
};

const canUseMixpanel = () => {
    if (typeof window === "undefined") {
        return false;
    }

    if (!MIXPANEL_TOKEN) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "Tokenul Mixpanel lipsește! Verifică variabila NEXT_PUBLIC_MIXPANEL_TOKEN.",
            );
        }
        return false;
    }

    if (!isInitialized) {
        mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
        isInitialized = true;
    }

    return true;
};

export const initMixpanel = () => {
    canUseMixpanel();
};

export const trackMixpanelEvent = (
    eventName: string,
    payload: Record<string, unknown> = {},
) => {
    if (!canUseMixpanel()) {
        return;
    }

    try {
        const trimmedEventName = eventName.trim();

        if (trimmedEventName.length === 0) {
            return;
        }

        const sanitizedPayload = sanitizeMixpanelProperties(payload);

        mixpanel.track(trimmedEventName, sanitizedPayload);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Failed to track Mixpanel event", error);
        }
    }
};

export const identifyMixpanelUser = (
    userId: string,
    traits?: Record<string, unknown>,
) => {
    if (!canUseMixpanel()) {
        return;
    }

    try {
        const trimmedId = userId.trim();
        if (trimmedId.length === 0) {
            return;
        }

        mixpanel.identify(trimmedId);

        if (traits && Object.keys(traits).length > 0) {
            const sanitizedTraits = sanitizeMixpanelProperties(traits);

            if (Object.keys(sanitizedTraits).length > 0) {
                mixpanel.people.set(sanitizedTraits);
            }
        }
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Failed to identify Mixpanel user", error);
        }
    }
};
