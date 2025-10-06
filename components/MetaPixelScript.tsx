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

  var shouldSkipPixel = false;

    try {
      if (!document.body) {
        shouldSkipPixel = false;
      } else {
        var bait = document.createElement('div');
        bait.setAttribute('aria-hidden', 'true');
        bait.style.position = 'absolute';
        bait.style.width = '1px';
        bait.style.height = '1px';
        bait.style.left = '-10000px';
        bait.style.top = '-10000px';
        bait.className = 'adsbox pub_300x250 banner_ad';

        bait.style.pointerEvents = 'none';
        bait.style.zIndex = '-1';

        document.body.appendChild(bait);

        var baitStyles = window.getComputedStyle(bait);
        shouldSkipPixel = baitStyles.display === 'none' || baitStyles.visibility === 'hidden' || bait.clientHeight === 0;

        document.body.removeChild(bait);
      }
    } catch (error) {
      shouldSkipPixel = false;
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
})();`;

    const noscriptMarkup = `
  <img height="1" width="1" style="display:none" alt=""
       src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />
`;

    return (
        <>
            <Script id="meta-pixel" strategy="afterInteractive">
                {snippet}
            </Script>
            <noscript dangerouslySetInnerHTML={{ __html: noscriptMarkup }} />
        </>
    );
};

export default MetaPixelScript;

