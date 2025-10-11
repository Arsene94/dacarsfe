import Script from "next/script";

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

const MetaPixelScript = () => {
    if (!pixelId) {
        return null;
    }

    const snippet = `(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  if (window.__dacarsMetaPixelHandled) {
    return;
  }

  window.__dacarsMetaPixelHandled = true;

  var queue = window.fbq;
  if (!queue || typeof queue !== 'function') {
    queue = function() {
      queue.callMethod ?
        queue.callMethod.apply(queue, arguments) :
        queue.queue.push(arguments);
    };
    queue.push = queue;
    queue.loaded = false;
    queue.version = '2.0';
    queue.queue = [];
    window.fbq = queue;
    window._fbq = queue;
  } else if (!window._fbq) {
    window._fbq = queue;
  }

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  script.setAttribute('data-meta-pixel', '${pixelId}');
  var firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else if (document.head) {
    document.head.appendChild(script);
  } else if (document.documentElement) {
    document.documentElement.appendChild(script);
  }

  queue('init', '${pixelId}');
  queue('track', 'PageView');
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

