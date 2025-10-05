import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let isMixpanelInitialized = false;

const ensureMixpanelInitialized = () => {
    if (!MIXPANEL_TOKEN) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "Tokenul Mixpanel lipsește! Verifică variabila NEXT_PUBLIC_MIXPANEL_TOKEN.",
            );
        }
        return false;
    }

    if (!isMixpanelInitialized) {
        mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
        isMixpanelInitialized = true;
    }

    return true;
};

export const trackMixpanelEvent = (
    eventName: string,
    properties?: Record<string, unknown>,
) => {
    if (typeof window === "undefined") {
        return;
    }

    if (!ensureMixpanelInitialized()) {
        return;
    }

    try {
        mixpanel.track(eventName, properties);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.error(
                "Nu am putut trimite evenimentul Mixpanel",
                error,
            );
        }
    }
};
