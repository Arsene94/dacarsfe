"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initMetaPixel, trackMetaPixelPageView, isMetaPixelConfigured } from "@/lib/metaPixel";

const MetaPixelInitializer = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const previousLocationRef = useRef<{ pathname: string; searchParamsKey: string } | null>(null);

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

        const normalizedPathname = typeof pathname === "string" ? pathname : "";
        const normalizedSearchParamsKey = typeof searchParamsKey === "string" ? searchParamsKey : "";
        const previousLocation = previousLocationRef.current;
        const isSameLocation =
            previousLocation !== null &&
            previousLocation.pathname === normalizedPathname &&
            previousLocation.searchParamsKey === normalizedSearchParamsKey;

        if (isSameLocation) {
            return;
        }

        previousLocationRef.current = {
            pathname: normalizedPathname,
            searchParamsKey: normalizedSearchParamsKey,
        };

        trackMetaPixelPageView();
    }, [pathname, searchParamsKey]);

    return null;
};

export default MetaPixelInitializer;

