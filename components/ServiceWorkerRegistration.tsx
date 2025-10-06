"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/sw.js";
const SERVICE_WORKER_SCOPE = "/";

const ServiceWorkerRegistration = () => {
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") {
            return;
        }

        if (!("serviceWorker" in navigator)) {
            return;
        }

        let isActive = true;

        const registerWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
                    scope: SERVICE_WORKER_SCOPE,
                });

                if (!isActive) {
                    return;
                }

                if (registration.installing) {
                    registration.installing.addEventListener("statechange", () => {
                        if (registration.installing?.state === "installed" && navigator.serviceWorker.controller) {
                            console.info("Service worker Meta Pixel actualizat");
                        }
                    });
                }
            } catch (error) {
                console.warn("Nu am putut înregistra service worker-ul pentru cache", error);
            }
        };

        registerWorker();

        return () => {
            isActive = false;
        };
    }, []);

    return null;
};

export default ServiceWorkerRegistration;
