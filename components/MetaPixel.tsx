"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
    bootstrapMetaPixelAdvancedMatching,
    isMetaPixelConfigured,
    trackMetaPixelPageView,
} from "@/lib/metaPixel";

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

    return null;
};

export default MetaPixel;
