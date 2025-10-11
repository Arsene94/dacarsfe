"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initMetaPixel, trackMetaPixelPageView, isMetaPixelConfigured } from "@/lib/metaPixel";

const PixelTracker = () => {
    const pathname = usePathname();
    const previousPathnameRef = useRef<string | null>(null);
    const previousHistoryKeyRef = useRef<string | null>(null);

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

        const currentHistoryKey = (() => {
            if (typeof window === "undefined") {
                return null;
            }

            try {
                const state = window.history?.state as { key?: unknown } | undefined;
                const key = state?.key;
                return typeof key === "string" && key.length > 0 ? key : null;
            } catch {
                return null;
            }
        })();

        if (
            previousPathnameRef.current === pathname &&
            previousHistoryKeyRef.current === currentHistoryKey
        ) {
            return;
        }

        previousPathnameRef.current = pathname;
        previousHistoryKeyRef.current = currentHistoryKey;

        trackMetaPixelPageView({ pathname, historyKey: currentHistoryKey ?? undefined });
    }, [pathname]);

    return null;
};

export default PixelTracker;

