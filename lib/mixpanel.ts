import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let isInitialized = false;
let warnedMissingToken = false;

const isBrowser = () => typeof window !== "undefined";

const ensureMixpanel = (): boolean => {
    if (!isBrowser()) {
        return false;
    }

    if (!MIXPANEL_TOKEN) {
        if (!warnedMissingToken && process.env.NODE_ENV !== "production") {
            console.warn("Mixpanel token is missing! Check your .env file.");
            warnedMissingToken = true;
        }
        return false;
    }

    if (!isInitialized) {
        mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
        isInitialized = true;
    }

    return true;
};

export const trackMixpanelEvent = (
    eventName: string,
    properties?: Record<string, unknown>,
): void => {
    if (!ensureMixpanel()) {
        return;
    }

    mixpanel.track(eventName, properties);
};
