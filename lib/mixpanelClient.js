import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

export const initMixpanel = () => {
    if (!MIXPANEL_TOKEN) {
        console.warn('Mixpanel token is missing! Check your .env file.');
        return;
    }

    mixpanel.init(MIXPANEL_TOKEN, { autocapture: true });
}

/**
 * Trim an object by removing entries with `null` or `undefined` values.
 * @param {Record<string, unknown> | undefined} value
 */
const sanitizeProps = (value) => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const entries = Object.entries(value).filter(([, propValue]) => propValue !== null && propValue !== undefined);
    if (entries.length === 0) {
        return undefined;
    }

    return Object.fromEntries(entries);
};

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [props]
 */
export const trackMixpanelEvent = (eventName, props) => {
    if (!MIXPANEL_TOKEN) {
        return;
    }

/**
 * @param {string} distinctId
 * @param {Record<string, unknown>} [traits]
 */
export const identifyMixpanelUser = (distinctId, traits) => {
    if (!MIXPANEL_TOKEN) {
        return;
    }

    mixpanel.identify(distinctId);

    const sanitizedTraits = sanitizeProps(traits);
    if (sanitizedTraits) {
        mixpanel.people.set(sanitizedTraits);
    if (typeof window === 'undefined') {
        return;
    }

    try {
        mixpanel.track(eventName, payload);
    } catch (error) {
        console.error('Failed to track Mixpanel event', error);
    }
};
