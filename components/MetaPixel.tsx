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

    return (
        <>
            <Script
                id="meta-pixel"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html:
                        "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','/scripts/fbevents.js');fbq('init', '" +
                        PIXEL_ID +
                        "');fbq('track', 'PageView');",
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
