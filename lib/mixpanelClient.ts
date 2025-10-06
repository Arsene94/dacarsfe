import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let isInitialized = false;

const isMixpanelDebugEnabled =
    (process.env.NEXT_PUBLIC_MIXPANEL_DEBUG ?? "").toLowerCase() === "true" ||
    (process.env.NODE_ENV !== "production" &&
        (process.env.NEXT_PUBLIC_MIXPANEL_DEBUG ?? "").toLowerCase() !== "false");

const logMixpanelDebug = (title: string, details?: Record<string, unknown>) => {
    if (!isMixpanelDebugEnabled) {
        return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[Mixpanel][${timestamp}] ${title}`;

    if (typeof window === "undefined") {
        console.info(prefix);
        if (details) {
            console.info(details);
        }
        return;
    }

    if (!details || Object.keys(details).length === 0) {
        console.info(prefix);
        return;
    }

    console.groupCollapsed(prefix);
    Object.entries(details).forEach(([key, value]) => {
        console.log(`${key}:`, value);
    });
    console.groupEnd();
};

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
        const entries = Object.entries(value as Record<string, unknown>).reduce<
            Array<[string, unknown]>
        >((acc, [key, nested]) => {
            const sanitizedNested = sanitizeMixpanelValue(nested);

            if (sanitizedNested === undefined) {
                return acc;
            }

            if (
                typeof sanitizedNested === "object" &&
                sanitizedNested !== null &&
                !Array.isArray(sanitizedNested) &&
                Object.keys(sanitizedNested).length === 0
            ) {
                return acc;
            }

            if (Array.isArray(sanitizedNested) && sanitizedNested.length === 0) {
                acc.push([key, []]);
                return acc;
            }

            acc.push([key, sanitizedNested]);
            return acc;
        }, []);

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
        logMixpanelDebug("Mixpanel inaccesibil în mediul curent (nu există window)");
        return false;
    }

    if (!MIXPANEL_TOKEN) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "Tokenul Mixpanel lipsește! Verifică variabila NEXT_PUBLIC_MIXPANEL_TOKEN.",
            );
        }
        logMixpanelDebug("Mixpanel dezactivat din cauza lipsei token-ului");
        return false;
    }

    if (!isInitialized) {
        mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
        logMixpanelDebug("Mixpanel a fost inițializat", {
            tokenPrefix: `${MIXPANEL_TOKEN.slice(0, 6)}…`,
            autocapture: true,
        });
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
            logMixpanelDebug("Eveniment Mixpanel ignorat – numele este gol", {
                rawEventName: eventName,
            });
            return;
        }

        const sanitizedPayload = sanitizeMixpanelProperties(payload);

        mixpanel.track(trimmedEventName, sanitizedPayload);
        logMixpanelDebug("Eveniment Mixpanel trimis", {
            event: trimmedEventName,
            payload: sanitizedPayload,
        });
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Failed to track Mixpanel event", error);
        }
        logMixpanelDebug("Eroare la trimiterea evenimentului Mixpanel", {
            event: eventName,
            error:
                error instanceof Error
                    ? { name: error.name, message: error.message }
                    : { message: "Unknown error" },
        });
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
            logMixpanelDebug("Identificare Mixpanel ignorată – ID gol", {
                rawUserId: userId,
            });
            return;
        }

        mixpanel.identify(trimmedId);
        logMixpanelDebug("Utilizator Mixpanel identificat", {
            userId: trimmedId,
        });

        if (traits && Object.keys(traits).length > 0) {
            const sanitizedTraits = sanitizeMixpanelProperties(traits);

            if (Object.keys(sanitizedTraits).length > 0) {
                mixpanel.people.set(sanitizedTraits);
                logMixpanelDebug("Trăsături Mixpanel actualizate", {
                    userId: trimmedId,
                    traits: sanitizedTraits,
                });
            }
        }
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Failed to identify Mixpanel user", error);
        }
        logMixpanelDebug("Eroare la identificarea utilizatorului Mixpanel", {
            userId,
            error:
                error instanceof Error
                    ? { name: error.name, message: error.message }
                    : { message: "Unknown error" },
        });
    }
};
