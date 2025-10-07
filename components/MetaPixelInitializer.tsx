"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initMetaPixel, trackMetaPixelPageView, isMetaPixelConfigured } from "@/lib/metaPixel";

const MetaPixelInitializer = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const hasInitializedRef = useRef(false);
    const previousLocationRef = useRef<{ pathname: string; searchParamsKey: string }>({
        pathname: "",
        searchParamsKey: "",
    });

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

        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            previousLocationRef.current = {
                pathname: normalizedPathname,
                searchParamsKey: normalizedSearchParamsKey,
            };
            return;
        }

        const { pathname: previousPathname, searchParamsKey: previousSearchParamsKey } = previousLocationRef.current;

        if (
            previousPathname === normalizedPathname &&
            previousSearchParamsKey === normalizedSearchParamsKey
        ) {
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

