"use client";

import { useEffect } from "react";

import { isMetaPixelConfigured } from "@/lib/metaPixel";

const SERVICE_WORKER_URL = "/sw.js";
const SERVICE_WORKER_SCOPE = "/";

const isLocalhost = (hostname: string): boolean => {
    return hostname === "localhost" || hostname === "127.0.0.1";
};

const MetaPixelServiceWorker = () => {
    useEffect(() => {
        if (!isMetaPixelConfigured()) {
            return;
        }

        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        const { hostname, protocol } = window.location;
        const secureContext = window.isSecureContext ?? protocol === "https:";

        if (!secureContext && !isLocalhost(hostname)) {
            return;
        }

        let cancelled = false;

        const register = async () => {
            try {
                const existing = await navigator.serviceWorker.getRegistration(
                    SERVICE_WORKER_URL,
                );

                if (cancelled) {
                    return;
                }

                if (existing) {
                    await existing.update();
                    return;
                }

                await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
                    scope: SERVICE_WORKER_SCOPE,
                });
            } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                    console.warn(
                        "Nu am putut înregistra service worker-ul pentru Meta Pixel",
                        error,
                    );
                }
            }
        };

        void register();

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
};

export default MetaPixelServiceWorker;
