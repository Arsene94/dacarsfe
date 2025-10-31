/* eslint-disable @next/next/no-before-interactive-script-outside-document */
import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim();

const MetaPixelHeadScripts = () => {
    if (!PIXEL_ID) {
        return null;
    }

    const bootstrapSnippet =
        "(function(){try{var global=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null;if(!global){return;}var existing=global.fbq;var copyArgs=function(args){var length=args.length;var result=new Array(length);for(var index=0;index<length;index+=1){result[index]=args[index];}return result;};if(typeof existing==='function'){if(!Array.isArray(existing.queue)){existing.queue=[];}var queue=existing.queue;var ensureQueue=function(){return function(){queue.push(copyArgs(arguments));};};if(typeof existing.push!=='function'){existing.push=ensureQueue();}if(typeof existing.callMethod!=='function'){existing.callMethod=ensureQueue();}return;}var queue=[];var enqueue=function(args){queue.push(copyArgs(args));};var stub=function(){enqueue(arguments);};stub.push=function(){enqueue(arguments);};stub.callMethod=function(){enqueue(arguments);};stub.queue=queue;stub.loaded=false;stub.version='2.0';global.fbq=stub;global._fbq=stub;}catch(error){}})();";
    const pixelIdLiteral = JSON.stringify(PIXEL_ID);
    const loaderSnippet =
        `(function(){try{var global=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null;if(!global){return;}var doc=typeof global.document!=='undefined'?global.document:null;if(!doc||!doc.createElement){return;}var tag='script';var script=doc.createElement(tag);script.async=true;script.src='/api/external/meta-pixel.js';var first=doc.getElementsByTagName?doc.getElementsByTagName(tag)[0]:null;if(first&&first.parentNode){first.parentNode.insertBefore(script,first);}else{(doc.head||doc.documentElement||doc.body||doc).appendChild(script);}}catch(error){}})();(function(){try{if(typeof fbq==='function'){fbq('init',${pixelIdLiteral});fbq('track','PageView');}}catch(error){}})();`;

    return (
        <>
            <Script
                id="meta-pixel-bootstrap"
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{ __html: bootstrapSnippet }}
            />
            <Script
                id="meta-pixel"
                strategy="worker"
                dangerouslySetInnerHTML={{ __html: loaderSnippet }}
            />
        </>
    );
};

export default MetaPixelHeadScripts;
