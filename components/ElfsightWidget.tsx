"use client";

import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://static.elfsight.com/platform/platform.js";

const appendElfsightScript = () => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
        return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.defer = true;
    script.setAttribute("data-use-service-core", "");
    document.body.appendChild(script);
};

export default function ElfsightWidget() {
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const current = sectionRef.current;
        if (!current) {
            return;
        }

        let observer: IntersectionObserver | null = null;

        const handleIntersection: IntersectionObserverCallback = (entries) => {
            const [entry] = entries;
            if (!entry?.isIntersecting) {
                return;
            }

            appendElfsightScript();
            current.dataset.widgetLoaded = "true";
            observer?.disconnect();
        };

        if ("IntersectionObserver" in window) {
            observer = new IntersectionObserver(handleIntersection, {
                rootMargin: "200px 0px",
            });
            observer.observe(current);
        } else {
            appendElfsightScript();
        }

        return () => {
            observer?.disconnect();
        };
    }, []);

    return (
        <section ref={sectionRef} className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in">
                    <div className="elfsight-app-59eeded2-1ad4-43a9-aba0-3cb2f0adac4c" />
                </div>
            </div>
        </section>
    );
}
