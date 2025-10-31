import Script from "next/script";

const TikTokPixelScript = () => {
    const bootstrapSnippet =
        "(()=>{try{var context=typeof window!=='undefined'?window:globalThis;if(!context){return;}var queue=context.ttq=context.ttq||[];var slice=Array.prototype.slice;var ensure=function(method){if(typeof queue[method]==='function'){return;}queue[method]=function(){queue.push([method].concat(slice.call(arguments,0)));};};ensure('track');ensure('identify');ensure('page');}catch(error){}})();";
    const loaderSnippet =
        "(()=>{try{var context=typeof window!=='undefined'?window:globalThis;if(!context){return;}var t='ttq';context.TiktokAnalyticsObject=t;var ttq=context[t]=context[t]||[];var d=context.document||null;ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];ttq.setAndDefer=function(obj,method){if(!obj){return;}obj[method]=function(){obj.push([method].concat(Array.prototype.slice.call(arguments,0)));};};for(var i=0;i<ttq.methods.length;i++){ttq.setAndDefer(ttq,ttq.methods[i]);}ttq.instance=function(id){ttq._i=ttq._i||{};var instance=ttq._i[id]=ttq._i[id]||[];for(var n=0;n<ttq.methods.length;n++){ttq.setAndDefer(instance,ttq.methods[n]);}return instance;};ttq.load=function(id,config){var src='/api/external/tiktok-pixel.js';var partner=config&&config.partner;ttq._i=ttq._i||{};ttq._i[id]=ttq._i[id]||[];ttq._i[id]._u=src;ttq._t=ttq._t||{};ttq._t[id]=+new Date();ttq._o=ttq._o||{};ttq._o[id]=config||{};if(!d||!d.createElement){return;}var script=d.createElement('script');script.type='text/javascript';script.async=true;script.src=src+'?sdkid='+id+'&lib='+t+(partner?'&partner='+partner:'');var firstScript=d.getElementsByTagName?d.getElementsByTagName('script')[0]:null;if(firstScript&&firstScript.parentNode){firstScript.parentNode.insertBefore(script,firstScript);}else{(d.head||d.documentElement||d.body||d).appendChild(script);}};ttq.load('D3HQ2ABC77U2R2QSSEPG');ttq.page();}catch(error){}})();";

    return (
        <>
            <script dangerouslySetInnerHTML={{ __html: bootstrapSnippet }} />
            <Script
                id="tiktok-pixel"
                strategy="worker"
                dangerouslySetInnerHTML={{ __html: loaderSnippet }}
            />
        </>
    );
};

export default TikTokPixelScript;

