class FacebookPixel {
  init() {}
  trackEvent() {}
  setExternalId() {}
  getExternalId() {
    return null;
  }
}

const TrackableEventNameEnum = {
  PageView: 'PageView',
  Lead: 'Lead',
};

export { FacebookPixel, TrackableEventNameEnum };
