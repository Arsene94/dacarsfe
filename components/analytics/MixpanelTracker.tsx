"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initMixpanel, trackPageView } from "@/lib/mixpanelClient";

type TrackerScope = "all" | "public" | "admin";

type MixpanelTrackerProps = {
    scope?: TrackerScope;
    properties?: Record<string, unknown>;
};

const matchesScope = (path: string, scope: TrackerScope): boolean => {
    if (scope === "all") {
        return true;
    }

    if (scope === "admin") {
        return path.startsWith("/admin");
    }

    return !path.startsWith("/admin");
};

export function MixpanelTracker({ scope = "all", properties }: MixpanelTrackerProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const propertiesRef = useRef(properties);

    const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);

    useEffect(() => {
        propertiesRef.current = properties;
    }, [properties]);

    useEffect(() => {
        initMixpanel();
    }, []);

    useEffect(() => {
        if (!pathname || !matchesScope(pathname, scope)) {
            return;
        }

        const fullPath = searchParamsString ? `${pathname}?${searchParamsString}` : pathname;

        trackPageView(fullPath, propertiesRef.current);
    }, [pathname, searchParamsString, scope]);

    return null;
}
