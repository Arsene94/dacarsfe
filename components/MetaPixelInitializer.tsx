"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initMetaPixel, trackMetaPixelPageView, isMetaPixelConfigured } from "@/lib/metaPixel";

const MetaPixelInitializer = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const hasTrackedInitialRef = useRef(false);

    const searchParamsKey = useMemo(() => {
        if (!searchParams) {
            return "";
        }
        return searchParams.toString();
    }, [searchParams]);

    useEffect(() => {
        initMetaPixel();
    }, []);

    useEffect(() => {
        if (!isMetaPixelConfigured()) {
            return;
        }

        if (!hasTrackedInitialRef.current) {
            hasTrackedInitialRef.current = true;
            return;
        }

        trackMetaPixelPageView();
    }, [pathname, searchParamsKey]);

    return null;
};

export default MetaPixelInitializer;

