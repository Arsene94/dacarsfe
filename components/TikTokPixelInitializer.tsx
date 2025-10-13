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

        const pagePayload = {
            page_path: pathname || undefined,
            page_search: searchParamsKey || undefined,
            page_title:
                typeof document !== "undefined" && document.title.trim().length > 0
                    ? document.title
                    : undefined,
            page_url: typeof window !== "undefined" ? window.location.href : undefined,
            referrer:
                typeof document !== "undefined" && document.referrer.trim().length > 0
                    ? document.referrer
                    : undefined,
            language:
                typeof navigator !== "undefined" && navigator.language
                    ? navigator.language
                    : undefined,
        } satisfies Record<string, unknown>;

        trackTikTokPageView(pagePayload);
    }, [pathname, searchParamsKey]);

    return null;
};

export default TikTokPixelInitializer;

