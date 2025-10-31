import Script from "next/script";

const TikTokPixelScript = () => (
    <Script id="tiktok-pixel" strategy="afterInteractive">
        {`
            !function (w, d, t) {
                w.TiktokAnalyticsObject = t;
                var ttq = (w[t] = w[t] || []);
                ttq.methods = [
                    "page",
                    "track",
                    "identify",
                    "instances",
                    "debug",
                    "on",
                    "off",
                    "once",
                    "ready",
                    "alias",
                    "group",
                    "enableCookie",
                    "disableCookie",
                    "holdConsent",
                    "revokeConsent",
                    "grantConsent",
                ];
                ttq.setAndDefer = function (target, method) {
                    if (!target[method]) {
                        target[method] = function () {
                            target.push([method].concat(Array.prototype.slice.call(arguments)));
                        };
                    }
                };
                ttq.set = ttq.set || function (target, config) {
                    ttq._setQueue = ttq._setQueue || [];
                    ttq._setQueue.push([target, config]);
                };
                ttq._i = ttq._i || {};
                ttq._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
                ttq._t = ttq._t || {};
                ttq._o = ttq._o || {};
                ttq.instance = function (id) {
                    var instance = ttq._i[id] = ttq._i[id] || [];
                    for (var i = 0; i < ttq.methods.length; i += 1) {
                        ttq.setAndDefer(instance, ttq.methods[i]);
                    }
                    return instance;
                };
                for (var i = 0; i < ttq.methods.length; i += 1) {
                    ttq.setAndDefer(ttq, ttq.methods[i]);
                }
                ttq.load = function (id, config) {
                    ttq._o[id] = config || {};
                    ttq._t[id] = +new Date();
                    ttq._i[id] = ttq._i[id] || [];
                    var script = d.createElement("script");
                    script.type = "text/javascript";
                    script.async = true;
                    script.src = ttq._u + "?sdkid=" + id + "&lib=" + t;
                    var firstScript = d.getElementsByTagName("script")[0];
                    if (firstScript && firstScript.parentNode) {
                        firstScript.parentNode.insertBefore(script, firstScript);
                    } else {
                        (d.head || d.documentElement).appendChild(script);
                    }
                };
                ttq.load("D3HQ2ABC77U2R2QSSEPG");
                ttq.page();
            }(window, document, "ttq");
        `}
    </Script>
);

export default TikTokPixelScript;

