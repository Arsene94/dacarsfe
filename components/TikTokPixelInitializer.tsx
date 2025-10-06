"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initTikTokPixel, trackTikTokPageView, isTikTokPixelConfigured } from "@/lib/tiktokPixel";

const TikTokPixelInitializer = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const searchParamsKey = useMemo(() => {
        if (!searchParams) {
            return "";
        }
        return searchParams.toString();
    }, [searchParams]);

    useEffect(() => {
        initTikTokPixel();
    }, []);

    useEffect(() => {
        if (!isTikTokPixelConfigured()) {
            return;
        }
        trackTikTokPageView();
    }, [pathname, searchParamsKey]);

    return null;
};

export default TikTokPixelInitializer;

