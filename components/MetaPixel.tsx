/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
    bootstrapMetaPixelAdvancedMatching,
    isMetaPixelConfigured,
    trackMetaPixelPageView,
} from "@/lib/metaPixel";

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim();

const MetaPixel = () => {
    const pathname = usePathname();
    const hasBootstrappedRef = useRef(false);
    const hasTrackedInitialRef = useRef(false);
    const lastPathnameRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isMetaPixelConfigured()) {
            return;
        }

        if (hasBootstrappedRef.current) {
            return;
        }

        hasBootstrappedRef.current = true;
        bootstrapMetaPixelAdvancedMatching();
    }, []);

    useEffect(() => {
        if (!isMetaPixelConfigured()) {
            return;
        }

        if (typeof pathname !== "string" || pathname.length === 0) {
            return;
        }

        if (!hasTrackedInitialRef.current) {
            hasTrackedInitialRef.current = true;
            lastPathnameRef.current = pathname;
            return;
        }

        if (lastPathnameRef.current === pathname) {
            return;
        }

        lastPathnameRef.current = pathname;
        trackMetaPixelPageView();
    }, [pathname]);

    if (!isMetaPixelConfigured() || !PIXEL_ID) {
        return null;
    }

    const noscriptSrc = `https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`;

    const bootstrapSnippet =
        "(()=>{try{var context=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null;if(!context){return;}var fbq=context.fbq;if(typeof fbq!=='function'){var queue=[];var placeholder=function(){placeholder.callMethod?placeholder.callMethod.apply(placeholder,arguments):placeholder.queue.push(arguments);};placeholder.queue=queue;placeholder.push=placeholder;placeholder.loaded=false;placeholder.version='2.0';placeholder.callMethod=function(){placeholder.queue.push(arguments);};context.fbq=placeholder;context._fbq=placeholder;fbq=placeholder;}if(!fbq.queue||!Array.isArray(fbq.queue)){fbq.queue=fbq.queue&&Array.isArray(fbq.queue)?fbq.queue:[];}if(typeof fbq.callMethod!=='function'){fbq.callMethod=function(){fbq.queue.push(arguments);};}if(typeof fbq.push!=='function'){fbq.push=function(){fbq.queue.push(arguments);};}}catch(error){}})();";
    const loaderSnippet =
        "(()=>{try{var context=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null;if(!context){return;}var doc=typeof context.document!=='undefined'?context.document:null;if(!doc){return;}var tag='script';var script=doc.createElement(tag);script.async=!0;script.src='/api/external/meta-pixel.js';var firstScript=doc.getElementsByTagName?doc.getElementsByTagName(tag)[0]:null;if(firstScript&&firstScript.parentNode){firstScript.parentNode.insertBefore(script,firstScript);}else{(doc.head||doc.documentElement||doc.body||doc).appendChild(script);}}catch(error){}})();";

    return (
        <>
            <script dangerouslySetInnerHTML={{ __html: bootstrapSnippet }} />
            <Script
                id="meta-pixel"
                strategy="worker"
                dangerouslySetInnerHTML={{
                    __html:
                        loaderSnippet +
                        ";(function(){try{fbq('init','" +
                        PIXEL_ID +
                        "');fbq('track','PageView');}catch(error){}})();",
                }}
            />
            <noscript>
                <img
                    height="1"
                    width="1"
                    style={{ display: "none" }}
                    src={noscriptSrc}
                    alt=""
                />
            </noscript>
        </>
    );
};

export default MetaPixel;
