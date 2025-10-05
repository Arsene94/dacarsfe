import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let isInitialized = false;

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
        mixpanel.track(eventName, payload);
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
            mixpanel.people.set(traits);
        }
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Failed to identify Mixpanel user", error);
        }
    }
};
