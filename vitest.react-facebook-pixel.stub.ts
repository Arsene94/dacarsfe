const noop = () => {};

const stubPixel = {
  init: noop,
  pageView: noop,
  track: noop,
  trackSingle: noop,
  trackCustom: noop,
  trackSingleCustom: noop,
  grantConsent: noop,
  revokeConsent: noop,
  clear: noop,
};

export default stubPixel;
