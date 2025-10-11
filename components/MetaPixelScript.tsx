import Script from "next/script";

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

const META_PIXEL_LIBRARY_PATH = "/scripts/fbevents.v20240926.js";

const MetaPixelScript = () => {
    if (!pixelId) {
        return null;
    }

    const snippet = `(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  var runPixelSetup = function() {
    if (window.__dacarsMetaPixelHandled) {
      return;
    }

    function finalizePixel(initiallySkipped) {
      var shouldSkipPixel = initiallySkipped === true;

      if (!shouldSkipPixel && typeof navigator !== 'undefined') {
        try {
          if (navigator.globalPrivacyControl === true) {
            shouldSkipPixel = true;
          }
        } catch (error) {}

        try {
          var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
          if (dnt === '1' || dnt === 'yes') {
            shouldSkipPixel = true;
          }
        } catch (error) {}
      }

      if (!shouldSkipPixel) {
        try {
          if (typeof window.canRunAds === 'boolean') {
            shouldSkipPixel = window.canRunAds === false;
          }
        } catch (error) {}
      }

      if (shouldSkipPixel) {
        var fbqStub = function fbqStub() {
          fbqStub.queue.push(arguments);
        };
        fbqStub.queue = [];
        fbqStub.push = fbqStub;
        fbqStub.loaded = false;
        fbqStub.version = '2.0';
        window.fbq = fbqStub;
        window._fbq = fbqStub;
        window.__dacarsMetaPixelHandled = true;
        return;
      }

      !function(f,b,e,v,n,t,s){
        if(f.fbq)return; n=f.fbq=function(){ n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;
        n.push=n; n.loaded=!0; n.version='2.0';
        n.queue=[]; t=b.createElement(e); t.async=!0;
        var src=v;
        try {
          src = new URL(v, f.location && f.location.href ? f.location.href : undefined).toString();
        } catch (error) {}
        t.src=src; s=b.getElementsByTagName(e)[0];
        s.parentNode?.insertBefore(t,s);
      }(window, document,'script','${META_PIXEL_LIBRARY_PATH}');
      fbq('init', '${pixelId}');
      fbq('set', 'autoConfig', false, '${pixelId}');
      fbq('consent', 'grant');
      fbq('track', 'PageView');
      window.__dacarsMetaPixelHandled = true;
    }

    try {
      if (window.brave && window.brave.isBrave) {
        window.brave.isBrave().then(function(isBrave) {
          finalizePixel(!!isBrave);
        }).catch(function() {
          finalizePixel(false);
        });
        return;
      }
    } catch (error) {}

    finalizePixel(false);
  };

  var schedule = function() {
    var callback = runPixelSetup;
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(callback, { timeout: 2500 });
    } else {
      window.setTimeout(callback, 1500);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    schedule();
  } else {
    document.addEventListener('DOMContentLoaded', function handle() {
      document.removeEventListener('DOMContentLoaded', handle);
      schedule();
    });
  }
})();`;

    const noscriptMarkup = `
  <img height="1" width="1" style="display:none" alt=""
       src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />
`;

    return (
        <>

            <Script id="meta-pixel" strategy="lazyOnload">
                {snippet}
            </Script>
            <noscript dangerouslySetInnerHTML={{ __html: noscriptMarkup }} />
        </>
    );
};

export default MetaPixelScript;

