/* eslint-disable @next/next/no-before-interactive-script-outside-document */
import Script from "next/script";

const TikTokPixelScript = () => {
    const bootstrapSnippet =
        "(function(){try{var global=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null;if(!global){return;}var existing=global.ttq;var queue;if(Array.isArray(existing)){queue=existing;}else{queue=[];if(existing&&typeof existing==='object'){for(var key in existing){if(Object.prototype.hasOwnProperty.call(existing,key)){queue[key]=existing[key];}}}}var makeEntry=function(method,args){var length=args.length+1;var entry=new Array(length);entry[0]=method;for(var index=0;index<args.length;index+=1){entry[index+1]=args[index];}return entry;};var ensure=function(method){if(typeof queue[method]==='function'){return;}queue[method]=function(){queue.push(makeEntry(method,arguments));};};ensure('track');ensure('identify');ensure('page');global.ttq=queue;}catch(error){}})();";
    const loaderSnippet =
        "(function(){try{var global=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null;if(!global){return;}var objectName='ttq';global.TiktokAnalyticsObject=objectName;var existing=global[objectName];var ttq;if(Array.isArray(existing)){ttq=existing;}else{ttq=[];if(existing&&typeof existing==='object'){for(var key in existing){if(Object.prototype.hasOwnProperty.call(existing,key)){ttq[key]=existing[key];}}}}global[objectName]=ttq;var doc=typeof global.document!=='undefined'?global.document:null;var makeEntry=function(method,args){var length=args.length+1;var entry=new Array(length);entry[0]=method;for(var index=0;index<args.length;index+=1){entry[index+1]=args[index];}return entry;};ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];ttq.setAndDefer=function(target,method){if(!target){return;}if(typeof target[method]==='function'){return;}target[method]=function(){target.push(makeEntry(method,arguments));};};for(var i=0;i<ttq.methods.length;i+=1){ttq.setAndDefer(ttq,ttq.methods[i]);}ttq.instance=function(id){ttq._i=ttq._i||{};var instance=ttq._i[id]=ttq._i[id]||[];for(var n=0;n<ttq.methods.length;n+=1){ttq.setAndDefer(instance,ttq.methods[n]);}return instance;};ttq.load=function(id,config){var src='/api/external/tiktok-pixel.js';var partner=config&&config.partner;ttq._i=ttq._i||{};ttq._i[id]=ttq._i[id]||[];ttq._i[id]._u=src;ttq._t=ttq._t||{};ttq._t[id]=+new Date();ttq._o=ttq._o||{};ttq._o[id]=config||{};if(!doc||!doc.createElement){return;}var script=doc.createElement('script');script.type='text/javascript';script.async=true;script.src=src+'?sdkid='+id+'&lib='+objectName+(partner?'&partner='+partner:'');var firstScript=doc.getElementsByTagName?doc.getElementsByTagName('script')[0]:null;if(firstScript&&firstScript.parentNode){firstScript.parentNode.insertBefore(script,firstScript);}else{(doc.head||doc.documentElement||doc.body||doc).appendChild(script);}};ttq.load('D3HQ2ABC77U2R2QSSEPG');ttq.page();}catch(error){}})();";

    return (
        <>
            <Script
                id="tiktok-pixel-bootstrap"
                strategy="beforeInteractive"
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

