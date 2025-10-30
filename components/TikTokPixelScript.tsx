import Script from "next/script";

const TikTokPixelScript = () => {
    const bootstrapSnippet =
        "!function(w){try{var t=w.ttq=w.ttq||[];var slice=Array.prototype.slice;if(!t.track){t.track=function(){t.push(['track'].concat(slice.call(arguments,0)));};}if(!t.identify){t.identify=function(){t.push(['identify'].concat(slice.call(arguments,0)));};}if(!t.page){t.page=function(){t.push(['page'].concat(slice.call(arguments,0)));};}}catch(e){}}(window);";
    const loaderSnippet =
        "!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];ttq.setAndDefer=function(obj,method){obj[method]=function(){obj.push([method].concat(Array.prototype.slice.call(arguments,0)));};};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(id){for(var instance=ttq._i[id]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(instance,ttq.methods[n]);return instance;};ttq.load=function(id,config){var src='/api/external/tiktok-pixel.js',partner=config&&config.partner;ttq._i=ttq._i||{};ttq._i[id]=[];ttq._i[id]._u=src;ttq._t=ttq._t||{};ttq._t[id]=+new Date;ttq._o=ttq._o||{};ttq._o[id]=config||{};config=d.createElement('script');config.type='text/javascript';config.async=!0;config.src=src+'?sdkid='+id+'&lib='+t;id=d.getElementsByTagName('script')[0];id.parentNode.insertBefore(config,id);};ttq.load('D3HQ2ABC77U2R2QSSEPG');ttq.page();}(window,document,'ttq');";

    return (
        <>
            <script
                dangerouslySetInnerHTML={{ __html: bootstrapSnippet }}
            />
            <Script
                id="tiktok-pixel"
                strategy="worker"
                dangerouslySetInnerHTML={{ __html: loaderSnippet }}
            />
        </>
    );
};

export default TikTokPixelScript;

