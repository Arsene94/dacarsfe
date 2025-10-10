"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { initMixpanel, trackPageView } from "@/lib/mixpanelClient";

const MixpanelInitializer = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastTrackedUrlRef = useRef<string | null>(null);

    const scheduleIdle = useCallback((callback: () => void, timeout = 1500) => {
        if (typeof window === "undefined") {
            return () => {
                // noop
            };
        }

        const win = window as typeof window & {
            requestIdleCallback?: (
                cb: IdleRequestCallback,
                options?: IdleRequestOptions,
            ) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        if (typeof win.requestIdleCallback === "function") {
            const handle = win.requestIdleCallback(
                () => {
                    callback();
                },
                { timeout },
            );

            return () => {
                win.cancelIdleCallback?.(handle);
            };
        }

        const timeoutHandle = window.setTimeout(callback, timeout);

        return () => {
            window.clearTimeout(timeoutHandle);
        };
    }, []);

    const searchParamsString = useMemo(() => {
        return searchParams?.toString() ?? "";
    }, [searchParams]);

    useEffect(() => {
        if (!pathname) {
            return;
        }

        const nextUrl = searchParamsString
            ? `${pathname}?${searchParamsString}`
            : pathname;

        if (lastTrackedUrlRef.current === nextUrl) {
            return;
        }

        lastTrackedUrlRef.current = nextUrl;

        const cancelIdle = scheduleIdle(() => {
            initMixpanel();
            trackPageView(nextUrl);
        });

        return cancelIdle;
    }, [pathname, scheduleIdle, searchParamsString]);

    return null;
};

export default MixpanelInitializer;
