"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initMetaPixel, trackMetaPixelPageView, isMetaPixelConfigured } from "@/lib/metaPixel";

type HistoryState = {
    key?: unknown;
    __NA?: {
        key?: unknown;
    } | null;
};

const resolveHistoryKey = (): string | null => {
    if (typeof window === "undefined" || !window.history) {
        return null;
    }

    const state = window.history.state as HistoryState | null | undefined;
    if (!state || typeof state !== "object") {
        return null;
    }

    if (typeof state.key === "string" && state.key.trim().length > 0) {
        return state.key;
    }

    const nestedState = state.__NA;
    if (nestedState && typeof nestedState === "object") {
        const nestedKey = (nestedState as { key?: unknown }).key;
        if (typeof nestedKey === "string" && nestedKey.trim().length > 0) {
            return nestedKey;
        }
    }

    return null;
};

const PixelTracker = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const previousLocationRef = useRef<{
        pathname: string;
        searchParamsKey: string;
        historyKey: string | null;
    } | null>(null);

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

        if (typeof pathname !== "string" || pathname.length === 0) {
            return;
        }

        const normalizedPathname = pathname;
        const normalizedSearchParamsKey = typeof searchParamsKey === "string" ? searchParamsKey : "";
        const previousLocation = previousLocationRef.current;
        const historyKey = resolveHistoryKey();
        const isSameLocation =
            previousLocation !== null &&
            previousLocation.pathname === normalizedPathname &&
            previousLocation.searchParamsKey === normalizedSearchParamsKey &&
            previousLocation.historyKey === historyKey;

        if (isSameLocation) {
            return;
        }

        previousLocationRef.current = {
            pathname: normalizedPathname,
            searchParamsKey: normalizedSearchParamsKey,
            historyKey,
        };

        trackMetaPixelPageView();
    }, [pathname, searchParamsKey]);

    return null;
};

export default PixelTracker;

