import Script from "next/script";

const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

const MetaPixelScript = () => {
    if (!pixelId) {
        return null;
    }

    const snippet = `!function(f,b,e,v,n,t,s){
  if(f.fbq)return; n=f.fbq=function(){ n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;
  n.push=n; n.loaded=!0; n.version='2.0';
  n.queue=[]; t=b.createElement(e); t.async=!0;
  t.src=v; s=b.getElementsByTagName(e)[0];
  s.parentNode?.insertBefore(t,s);
}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('consent', 'grant');
fbq('track', 'PageView');`;

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

