import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

export const initMixpanel = () => {
    if (!MIXPANEL_TOKEN) {
        console.warn('Mixpanel token is missing! Check your .env file.');
        return;
    }

    mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
}

export const trackMixpanelEvent = (eventName, properties = {}) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (!MIXPANEL_TOKEN) {
        return;
    }

    try {
        mixpanel.track(eventName, properties);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to track Mixpanel event', error);
        }
    }
}
