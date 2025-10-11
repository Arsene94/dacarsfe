"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initMetaPixel, trackMetaPixelPageView, isMetaPixelConfigured } from "@/lib/metaPixel";

const PixelTracker = () => {
    const pathname = usePathname();
    const previousPathnameRef = useRef<string | null>(null);

    useEffect(() => {
        initMetaPixel();
    }, []);

    useEffect(() => {
        if (!isMetaPixelConfigured()) {
            return;
        }

        if (typeof pathname !== "string" || pathname.length === 0) {
            return;
        }

        if (previousPathnameRef.current === pathname) {
            return;
        }

        previousPathnameRef.current = pathname;
        trackMetaPixelPageView();
    }, [pathname]);

    return null;
};

export default PixelTracker;

