import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

const isClient = () => typeof window !== 'undefined';

let mixpanelInitialized = false;

const ensureInitialized = () => {
    if (!MIXPANEL_TOKEN || !isClient()) {
        return false;
    }

    if (!mixpanelInitialized) {
        mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
        mixpanelInitialized = true;
    }

    return true;
};

export const initMixpanel = () => {
    if (!isClient()) {
        return;
    }

    if (!MIXPANEL_TOKEN) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('Mixpanel token is missing! Check your .env file.');
        }
        return;
    }

    ensureInitialized();
};

export const trackMixpanelEvent = (eventName, properties = {}) => {
    if (!eventName || typeof eventName !== 'string') {
        return;
    }

    const ready = ensureInitialized();
    if (!ready) {
        return;
    }

    try {
        mixpanel.track(eventName, properties);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to send Mixpanel event', error);
        }
    }
};
