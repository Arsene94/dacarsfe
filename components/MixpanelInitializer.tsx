"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

import { initMixpanel, trackPageView } from "@/lib/mixpanelClient";

const MixpanelInitializer = () => {
    const router = useRouter();

    useEffect(() => {
        initMixpanel();

        const initialPath =
            typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : router.asPath;

        trackPageView(initialPath);

        const handleRouteChange = (url: string) => {
            trackPageView(url);
        };

        router.events.on("routeChangeComplete", handleRouteChange);

        return () => {
            router.events.off("routeChangeComplete", handleRouteChange);
        };
    }, [router]);

    return null;
};

export default MixpanelInitializer;
