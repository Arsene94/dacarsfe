"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { initMixpanel, trackPageView } from "@/lib/mixpanelClient";

const MixpanelInitializer = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastTrackedUrlRef = useRef<string | null>(null);

    const searchParamsString = useMemo(() => {
        return searchParams?.toString() ?? "";
    }, [searchParams]);

    useEffect(() => {
        if (!pathname) {
            return;
        }

        initMixpanel();

        const nextUrl = searchParamsString
            ? `${pathname}?${searchParamsString}`
            : pathname;

        if (lastTrackedUrlRef.current === nextUrl) {
            return;
        }

        lastTrackedUrlRef.current = nextUrl;
        trackPageView(nextUrl);
    }, [pathname, searchParamsString]);

    return null;
};

export default MixpanelInitializer;
