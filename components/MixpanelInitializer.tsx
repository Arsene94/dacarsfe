"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { initMixpanel, trackPageView } from "@/lib/mixpanelClient";

const MixpanelInitializer = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastTrackedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        initMixpanel();
    }, []);

    const currentUrl = useMemo(() => {
        if (!pathname) {
            return null;
        }

        const query = searchParams?.toString();

        if (query && query.length > 0) {
            return `${pathname}?${query}`;
        }

        return pathname;
    }, [pathname, searchParams]);

    useEffect(() => {
        if (!currentUrl) {
            return;
        }

        if (lastTrackedUrlRef.current === currentUrl) {
            return;
        }

        lastTrackedUrlRef.current = currentUrl;
        trackPageView(currentUrl);
    }, [currentUrl]);

    return null;
};

export default MixpanelInitializer;
