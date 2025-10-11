const noop = () => {};

const stubPixel = {
    init: noop,
    pageView: noop,
    track: noop,
    trackSingle: noop,
    trackCustom: noop,
    trackSingleCustom: noop,
    loadPixel: noop,
    revokeConsent: noop,
    grantConsent: noop,
    clear: noop,
};

export default stubPixel;
