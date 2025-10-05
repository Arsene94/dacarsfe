import mixpanel from "mixpanel-browser";

type TrackerProperties = Record<string, unknown>;

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let hasInitialized = false;

export const initMixpanel = (): boolean => {
    if (hasInitialized) {
        return true;
    }

    if (!MIXPANEL_TOKEN) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Mixpanel token is missing! Check your .env file.");
        }

        return false;
    }

    mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
    hasInitialized = true;

    return true;
};

export const trackPageView = (path: string, properties: TrackerProperties = {}): void => {
    const initialized = hasInitialized || initMixpanel();

    if (!initialized) {
        return;
    }

    mixpanel.track("Page View", {
        path,
        ...properties,
    });
};
