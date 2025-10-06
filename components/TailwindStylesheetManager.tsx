"use client";

import { useEffect } from "react";

const TAILWIND_ASYNC_SELECTOR = 'link[data-async-css="tailwind"]';
const CRITICAL_STYLE_ID = "critical-tailwind";

const TailwindStylesheetManager = () => {
    useEffect(() => {
        const link = document.querySelector<HTMLLinkElement>(TAILWIND_ASYNC_SELECTOR);
        if (!link) {
            return;
        }

        const critical = document.getElementById(CRITICAL_STYLE_ID);

        const enableStylesheet = () => {
            if (link.media !== "all") {
                link.media = "all";
            }
            if (critical && critical.parentNode) {
                critical.parentNode.removeChild(critical);
            }
        };

        if (link.sheet) {
            enableStylesheet();
            return;
        }

        const handleLoad = () => {
            enableStylesheet();
        };

        link.addEventListener("load", handleLoad, { once: true });

        const timeout = window.setTimeout(() => {
            enableStylesheet();
        }, 3000);

        return () => {
            link.removeEventListener("load", handleLoad);
            window.clearTimeout(timeout);
        };
    }, []);

    return null;
};

export default TailwindStylesheetManager;
