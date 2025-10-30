"use client";

import dynamic from "next/dynamic";
import DeferredHydration from "@/components/DeferredHydration";

const CampaignTrackingInitializer = dynamic(
    () => import("./CampaignTrackingInitializer"),
    { ssr: false, loading: () => null },
);

const MixpanelInitializer = dynamic(
    () => import("./MixpanelInitializer"),
    { ssr: false, loading: () => null },
);

const MetaPixel = dynamic(() => import("./MetaPixel"), {
    ssr: false,
    loading: () => null,
});

const MetaPixelServiceWorker = dynamic(
    () => import("./MetaPixelServiceWorker"),
    { ssr: false, loading: () => null },
);

const AnalyticsTracker = dynamic(
    () => import("./AnalyticsTracker"),
    { ssr: false, loading: () => null },
);

const AnalyticsHydrator = () => (
    <DeferredHydration timeout={2500}>
        {() => (
            <>
                <CampaignTrackingInitializer />
                <MixpanelInitializer />
                <MetaPixel />
                <MetaPixelServiceWorker />
                <AnalyticsTracker />
            </>
        )}
    </DeferredHydration>
);

export default AnalyticsHydrator;
