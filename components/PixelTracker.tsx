"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
    initFacebookPixel,
    trackFacebookPixelPageView,
    isFacebookPixelConfigured,
    FACEBOOK_PIXEL_EVENTS,
    getFacebookPixelAdvancedMatchingSnapshot,
} from "@/lib/facebookPixel";
import { getBrowserCookieValue } from "@/lib/browserCookies";

const PixelTracker = () => {
    const pathname = usePathname();
    const previousPathnameRef = useRef<string | null>(null);
    const previousHistoryKeyRef = useRef<string | null>(null);
    const ipAddressRef = useRef<string | null>(null);
    const ipAddressPromiseRef = useRef<Promise<string | null> | null>(null);

    const fetchIpAddress = useCallback(async (): Promise<string | null> => {
        if (ipAddressRef.current) {
            return ipAddressRef.current;
        }

        if (ipAddressPromiseRef.current) {
            return ipAddressPromiseRef.current;
        }

        const promise = (async () => {
            try {
                const response = await fetch("/api/ip", { cache: "no-store" });
                if (!response.ok) {
                    return null;
                }

                const data = (await response.json()) as { ip?: unknown };
                const rawIp = typeof data.ip === "string" ? data.ip.trim() : "";
                if (rawIp.length > 0) {
                    ipAddressRef.current = rawIp;
                    return rawIp;
                }

                return null;
            } catch (error) {
                console.warn("Nu s-a putut obține adresa IP pentru Meta PageView", error);
                return null;
            } finally {
                ipAddressPromiseRef.current = null;
            }
        })();

        ipAddressPromiseRef.current = promise;
        return promise;
    }, []);

    useEffect(() => {
        initFacebookPixel();
    }, []);

    useEffect(() => {
        if (!isFacebookPixelConfigured()) {
            return;
        }

        if (typeof pathname !== "string" || pathname.length === 0) {
            return;
        }

        const currentHistoryKey = (() => {
            if (typeof window === "undefined") {
                return null;
            }

            try {
                const state = window.history?.state as { key?: unknown } | undefined;
                const key = state?.key;
                return typeof key === "string" && key.length > 0 ? key : null;
            } catch {
                return null;
            }
        })();

        if (
            previousPathnameRef.current === pathname &&
            previousHistoryKeyRef.current === currentHistoryKey
        ) {
            return;
        }

        previousPathnameRef.current = pathname;
        previousHistoryKeyRef.current = currentHistoryKey;

        trackFacebookPixelPageView();

        const trackMetaPageView = async () => {
            const fbc = getBrowserCookieValue("_fbc");
            const fbp = getBrowserCookieValue("_fbp");
            const ipAddress = await fetchIpAddress();

            let userAgent: string | undefined;
            if (typeof window !== "undefined") {
                const agent = window.navigator?.userAgent;
                if (typeof agent === "string") {
                    const trimmed = agent.trim();
                    if (trimmed.length > 0) {
                        userAgent = trimmed;
                    }
                }
            }

            let eventSourceUrl: string | undefined;
            if (typeof window !== "undefined") {
                const href = window.location?.href;
                if (typeof href === "string") {
                    const trimmed = href.trim();
                    if (trimmed.length > 0) {
                        eventSourceUrl = trimmed;
                    }
                }
            }

            const advancedMatching = getFacebookPixelAdvancedMatchingSnapshot();
            const externalIdSource = advancedMatching?.external_id;
            let externalId: string | undefined;

            if (typeof externalIdSource === "string") {
                const trimmed = externalIdSource.trim();
                if (trimmed.length > 0) {
                    externalId = trimmed;
                }
            } else if (typeof externalIdSource === "number" && Number.isFinite(externalIdSource)) {
                const normalized = String(externalIdSource).trim();
                if (normalized.length > 0) {
                    externalId = normalized;
                }
            }

            try {
                await fetch("/api/meta-page-view", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        eventName: FACEBOOK_PIXEL_EVENTS.PAGE_VIEW,
                        eventSourceUrl,
                        fbc: fbc ?? undefined,
                        fbp: fbp ?? undefined,
                        ipAddress: ipAddress ?? undefined,
                        userAgent,
                        externalId,
                    }),
                });
            } catch (error) {
                console.warn("Nu s-a putut trimite evenimentul Meta PageView", error);
            }
        };

        void trackMetaPageView();
    }, [pathname, fetchIpAddress]);

    return null;
};

export default PixelTracker;

