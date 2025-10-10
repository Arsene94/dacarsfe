"use client";

import { useEffect, useRef, useState } from "react";

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

const PLACEHOLDER_MIN_HEIGHT = 520;

export default function ElfsightWidget() {
    const sectionRef = useRef<HTMLElement>(null);
    const widgetContainerRef = useRef<HTMLDivElement>(null);
    const [hasRequestedWidget, setHasRequestedWidget] = useState(false);
    const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

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
            setHasRequestedWidget(true);
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

    useEffect(() => {
        if (isWidgetLoaded) {
            return;
        }

        const widgetRoot = widgetContainerRef.current;
        if (!widgetRoot) {
            return;
        }

        const markAsLoaded = () => {
            if (widgetRoot.childElementCount > 0) {
                setIsWidgetLoaded(true);
                return true;
            }
            return false;
        };

        if (markAsLoaded()) {
            return;
        }

        const mutationObserver = new MutationObserver(() => {
            if (markAsLoaded()) {
                mutationObserver.disconnect();
            }
        });

        mutationObserver.observe(widgetRoot, { childList: true });

        const timeout = window.setTimeout(() => {
            setIsWidgetLoaded(true);
        }, 8000);

        return () => {
            mutationObserver.disconnect();
            window.clearTimeout(timeout);
        };
    }, [isWidgetLoaded]);

    return (
        <section ref={sectionRef} className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16 animate-fade-in">
                    <div
                        ref={widgetContainerRef}
                        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white/80 shadow-lg transition-[min-height]"
                        style={{ minHeight: isWidgetLoaded ? undefined : PLACEHOLDER_MIN_HEIGHT }}
                    >
                        {!isWidgetLoaded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/80 px-6 py-10">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-jade border-t-transparent" />
                                <div className="space-y-2">
                                    <p className="font-poppins text-lg font-semibold text-berkeley">
                                        Recenzii de la clienții DaCars
                                    </p>
                                    <p className="font-dm-sans text-sm text-gray-600">
                                        Încărcăm widgetul cu testimoniale verificate...
                                    </p>
                                </div>
                            </div>
                        )}
                        <div
                            className="elfsight-app-59eeded2-1ad4-43a9-aba0-3cb2f0adac4c"
                            aria-hidden={!isWidgetLoaded}
                        />
                    </div>
                    {!isWidgetLoaded && (
                        <p className="mt-6 font-dm-sans text-sm text-gray-500">
                            {hasRequestedWidget
                                ? "Conținutul se încarcă..."
                                : "Widgetul se va încărca atunci când ajunge în vizor."}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
