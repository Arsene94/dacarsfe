"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
    disableAnalyticsTracking,
    enableAnalyticsTracking,
    flushQueue as flushAnalyticsQueue,
    isAnalyticsTrackingEnabled,
    trackAnalyticsEvent,
    trackPageView,
} from "@/lib/analytics";
import type { AnalyticsMetadata } from "@/types/analytics";

const SCROLL_THRESHOLDS = [10, 25, 50, 75, 90, 100];
const SCROLL_SECTION_SELECTOR = "[data-analytics-scroll-section]" as const;

type ScrollTargetKey = "window" | HTMLElement;

type ScrollContextState = {
    thresholds: Set<number>;
    lastPercentage: number;
};

const isPublicPath = (pathname: string | null): boolean => {
    if (!pathname) {
        return false;
    }
    return !pathname.startsWith("/admin") && !pathname.startsWith("/api");
};

const buildUrlFromParts = (pathname: string, search: string): string => {
    if (typeof window === "undefined") {
        return pathname;
    }

    const searchSuffix = search ? `?${search}` : "";
    try {
        const origin = window.location.origin;
        return `${origin}${pathname}${searchSuffix}`;
    } catch (error) {
        console.warn("Nu am putut compune URL-ul complet pentru analytics", error);
        return `${pathname}${searchSuffix}`;
    }
};

const buildElementSelector = (element: HTMLElement | null): string => {
    if (!element) {
        return "unknown";
    }

    const segments: string[] = [];
    let current: HTMLElement | null = element;

    while (current && segments.length < 5) {
        const tag = current.tagName.toLowerCase();
        const id = current.id ? `#${current.id}` : "";
        const className = current.className
            ? `.${current.className
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(".")}`
            : "";
        segments.unshift(`${tag}${id}${className}`);
        current = current.parentElement;
    }

    return segments.join(" > ");
};

const parseAdditionalMetadata = (raw: string | undefined): Record<string, unknown> | undefined => {
    if (!raw) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return parsed;
    } catch (error) {
        console.warn("Nu am putut parsa metadata suplimentară pentru analytics", error);
        return undefined;
    }
};

const getOrCreateContextState = (
    contexts: Map<ScrollTargetKey, ScrollContextState>,
    target: ScrollTargetKey,
): ScrollContextState => {
    const existing = contexts.get(target);
    if (existing) {
        return existing;
    }

    const next: ScrollContextState = { thresholds: new Set(), lastPercentage: 0 };
    contexts.set(target, next);
    return next;
};

const resolveElementLabel = (element: HTMLElement | null): string | undefined => {
    if (!element) {
        return undefined;
    }

    const { dataset } = element;
    const explicitLabel =
        dataset.analyticsScrollLabel ||
        dataset.analyticsLabel ||
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
            ? element.placeholder
            : null) ||
        element.id ||
        undefined;

    if (explicitLabel && explicitLabel.trim().length > 0) {
        return explicitLabel.trim().slice(0, 200);
    }

    const headingText = element
        .querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6")
        ?.textContent?.trim();
    if (headingText && headingText.length > 0) {
        return headingText.slice(0, 200);
    }

    const textContent = element.textContent?.trim();
    if (textContent && textContent.length > 0) {
        return textContent.slice(0, 200);
    }

    return undefined;
};

const getActiveScrollSection = (target: ScrollTargetKey): HTMLElement | null => {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return null;
    }

    const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;

    if (viewportWidth === 0 && viewportHeight === 0) {
        return null;
    }

    if (target === "window") {
        const x = Math.min(Math.max(viewportWidth / 2, 0), Math.max(viewportWidth - 1, 0));
        const y = Math.min(Math.max(viewportHeight * 0.4, 0), Math.max(viewportHeight - 1, 0));
        const candidate = document.elementFromPoint(x, y) as HTMLElement | null;
        return candidate?.closest<HTMLElement>(SCROLL_SECTION_SELECTOR) ?? null;
    }

    if (!document.contains(target)) {
        return null;
    }

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + Math.min(rect.height * 0.4, rect.height / 2);

    const x = Math.min(Math.max(centerX, 0), Math.max(viewportWidth - 1, 0));
    const y = Math.min(Math.max(centerY, 0), Math.max(viewportHeight - 1, 0));

    const candidate = document.elementFromPoint(x, y) as HTMLElement | null;

    return (
        candidate?.closest<HTMLElement>(SCROLL_SECTION_SELECTOR) ??
        target.closest<HTMLElement>(SCROLL_SECTION_SELECTOR)
    );
};

const buildScrollEventMetadata = (
    target: ScrollTargetKey,
    threshold: number,
    percentage: number,
    pixels: number,
): AnalyticsMetadata => {
    const metadata: AnalyticsMetadata = {
        scroll_percentage: percentage,
        scroll_pixels: Math.round(pixels),
    };

    const additional: Record<string, unknown> = {
        threshold,
        scroll_context: target === "window" ? "window" : "element",
    };

    if (typeof document !== "undefined") {
        if (target === "window") {
            additional.scroll_container_selector = buildElementSelector(document.body);
        } else {
            additional.scroll_container_selector = buildElementSelector(target);
            if (target.id) {
                additional.scroll_container_id = target.id;
            }
            const containerTarget =
                target.dataset?.analyticsScrollTarget || target.dataset?.analyticsTarget;
            if (containerTarget) {
                additional.scroll_container = containerTarget;
                if (!metadata.interaction_target) {
                    metadata.interaction_target = containerTarget;
                }
            }

            const containerLabel = resolveElementLabel(target);
            if (containerLabel && !metadata.interaction_label) {
                metadata.interaction_label = containerLabel;
            }

            const containerAdditional = parseAdditionalMetadata(
                target.dataset?.analyticsScrollMetadata,
            );
            if (containerAdditional) {
                additional.scroll_container_additional = containerAdditional;
            }

            const containerDataset: Record<string, string> = {};
            Object.entries(target.dataset ?? {}).forEach(([key, value]) => {
                if (!value) {
                    return;
                }
                if (
                    key === "analyticsScrollSection" ||
                    key === "analyticsScrollTarget" ||
                    key === "analyticsScrollLabel" ||
                    key === "analyticsScrollMetadata"
                ) {
                    return;
                }
                if (key.startsWith("analyticsScroll")) {
                    containerDataset[key] = value;
                }
            });

            if (Object.keys(containerDataset).length > 0) {
                additional.scroll_container_dataset = containerDataset;
            }
        }
    }

    if (!metadata.interaction_target) {
        metadata.interaction_target = target === "window" ? "window" : buildElementSelector(target);
    }
    if (!metadata.interaction_label) {
        metadata.interaction_label = target === "window" ? "window" : resolveElementLabel(target) ?? undefined;
    }

    const section = getActiveScrollSection(target);
    if (section) {
        const sectionSelector = buildElementSelector(section);
        const sectionTarget = section.dataset.analyticsScrollTarget || section.dataset.analyticsTarget;
        const sectionLabel = resolveElementLabel(section);

        additional.section_selector = sectionSelector;
        if (sectionTarget) {
            additional.section_target = sectionTarget;
        }
        if (section.id) {
            additional.section_id = section.id;
        }

        const rawAdditional = parseAdditionalMetadata(section.dataset.analyticsScrollMetadata);
        if (rawAdditional) {
            additional.section_additional = rawAdditional;
        }

        const datasetAdditional: Record<string, string> = {};
        Object.entries(section.dataset).forEach(([key, value]) => {
            if (!value) {
                return;
            }
            if (
                key === "analyticsScrollSection" ||
                key === "analyticsScrollTarget" ||
                key === "analyticsScrollLabel" ||
                key === "analyticsScrollMetadata"
            ) {
                return;
            }
            if (key.startsWith("analyticsScroll")) {
                datasetAdditional[key] = value;
            }
        });

        if (Object.keys(datasetAdditional).length > 0) {
            additional.section_dataset = datasetAdditional;
        }

        metadata.interaction_target = sectionTarget || sectionSelector;
        if (sectionLabel) {
            metadata.interaction_label = sectionLabel;
        }
    }

    metadata.additional = additional;
    return metadata;
};

const useScrollTracking = (enabled: boolean, resetKey?: string) => {
    const contextsRef = useRef<Map<ScrollTargetKey, ScrollContextState>>(new Map());
    const pendingTargetsRef = useRef<Set<ScrollTargetKey>>(new Set());
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const contexts = contextsRef.current;
        const pendingTargets = pendingTargetsRef.current;
        contexts.clear();
        pendingTargets.clear();

        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        if (!enabled) {
            return;
        }

        if (typeof window === "undefined" || typeof document === "undefined") {
            return;
        }

        let destroyed = false;

        const calculateForTarget = (target: ScrollTargetKey) => {
            if (destroyed || !isAnalyticsTrackingEnabled()) {
                return;
            }

            if (typeof document === "undefined") {
                return;
            }

            if (target !== "window" && !document.contains(target)) {
                contexts.delete(target);
                return;
            }

            const state = getOrCreateContextState(contexts, target);

            let scrollTop = 0;
            let viewportHeight = 0;
            let scrollHeight = 0;

            if (target === "window") {
                const doc = document.documentElement;
                const body = document.body;
                if (!doc || !body) {
                    return;
                }
                scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
                viewportHeight = window.innerHeight || doc.clientHeight || body.clientHeight || 0;
                scrollHeight = Math.max(
                    body.scrollHeight,
                    doc.scrollHeight,
                    body.offsetHeight,
                    doc.offsetHeight,
                    body.clientHeight,
                    doc.clientHeight,
                );
            } else {
                scrollTop = target.scrollTop;
                viewportHeight = target.clientHeight;
                scrollHeight = target.scrollHeight;
            }

            const maxScrollable = Math.max(scrollHeight - viewportHeight, 0);
            const percentage = maxScrollable > 0 ? (scrollTop / maxScrollable) * 100 : 100;
            const roundedPercentage = Math.min(100, Math.max(0, Number(percentage.toFixed(2))));
            const pixels = Math.max(scrollTop, 0);

            if (roundedPercentage <= state.lastPercentage) {
                state.lastPercentage = Math.max(state.lastPercentage, roundedPercentage);
                return;
            }

            state.lastPercentage = roundedPercentage;

            SCROLL_THRESHOLDS.forEach((threshold) => {
                if (roundedPercentage >= threshold && !state.thresholds.has(threshold)) {
                    state.thresholds.add(threshold);
                    const metadata = buildScrollEventMetadata(target, threshold, roundedPercentage, pixels);
                    trackAnalyticsEvent({ type: "scroll", metadata });
                }
            });
        };

        const scheduleCalculation = (target: ScrollTargetKey) => {
            if (destroyed || !isAnalyticsTrackingEnabled()) {
                return;
            }

            pendingTargets.add(target);
            if (rafRef.current != null) {
                return;
            }

            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                const targets = Array.from(pendingTargets);
                pendingTargets.clear();
                targets.forEach((currentTarget) => {
                    calculateForTarget(currentTarget);
                });
            });
        };

        const handleWindowScroll = () => {
            scheduleCalculation("window");
        };

        const handleWindowResize = () => {
            scheduleCalculation("window");
        };

        const handleElementScroll = (event: Event) => {
            const { target } = event;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            scheduleCalculation(target);
        };

        scheduleCalculation("window");
        window.addEventListener("scroll", handleWindowScroll, { passive: true });
        window.addEventListener("resize", handleWindowResize);
        document.addEventListener("scroll", handleElementScroll, true);

        return () => {
            destroyed = true;
            window.removeEventListener("scroll", handleWindowScroll);
            window.removeEventListener("resize", handleWindowResize);
            document.removeEventListener("scroll", handleElementScroll, true);
            contexts.clear();
            pendingTargets.clear();
            if (rafRef.current != null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [enabled, resetKey]);
};

const useCtaTracking = (enabled: boolean) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleClick = (event: MouseEvent) => {
            if (!isAnalyticsTrackingEnabled()) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const element = target?.closest<HTMLElement>("[data-analytics-event], [data-analytics-cta]");
            if (!element) {
                return;
            }

            const type = element.dataset.analyticsEvent || (element.dataset.analyticsCta ? "cta_click" : undefined);
            if (!type) {
                return;
            }

            const metadata: AnalyticsMetadata = {};
            const label = element.dataset.analyticsLabel;
            const targetId = element.dataset.analyticsTarget;
            const rawAdditional = parseAdditionalMetadata(element.dataset.analyticsMetadata);

            if (label) {
                metadata.interaction_label = label;
            } else {
                const fallbackLabel = element.textContent?.trim();
                if (fallbackLabel) {
                    metadata.interaction_label = fallbackLabel.slice(0, 200);
                }
            }

            metadata.interaction_target = targetId || buildElementSelector(element);

            const datasetAdditional: Record<string, unknown> = {};
            Object.entries(element.dataset).forEach(([key, value]) => {
                if (value == null) {
                    return;
                }
                if (
                    key === "analyticsEvent" ||
                    key === "analyticsLabel" ||
                    key === "analyticsTarget" ||
                    key === "analyticsMetadata" ||
                    key === "analyticsCta"
                ) {
                    return;
                }
                datasetAdditional[key] = value;
            });

            if (rawAdditional || Object.keys(datasetAdditional).length > 0) {
                metadata.additional = {
                    ...(rawAdditional ?? {}),
                    ...(Object.keys(datasetAdditional).length > 0 ? { dataset: datasetAdditional } : {}),
                };
            }

            trackAnalyticsEvent({ type, metadata });
        };

        window.addEventListener("click", handleClick);
        return () => {
            window.removeEventListener("click", handleClick);
        };
    }, [enabled]);
};

const useFormTracking = (enabled: boolean) => {
    const startedFormsRef = useRef<WeakSet<HTMLFormElement>>();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        startedFormsRef.current = new WeakSet<HTMLFormElement>();

        const handleFocusIn = (event: FocusEvent) => {
            if (!isAnalyticsTrackingEnabled()) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const form = target?.closest<HTMLFormElement>("form[data-analytics-form]");
            if (!form) {
                return;
            }

            const startedForms = startedFormsRef.current;
            if (startedForms?.has(form)) {
                return;
            }

            startedForms?.add(form);

            const metadata: AnalyticsMetadata = {
                interaction_target: form.dataset.analyticsTarget || buildElementSelector(form),
                interaction_label:
                    form.dataset.analyticsLabel ||
                    form.getAttribute("aria-label") ||
                    form.getAttribute("name") ||
                    form.id ||
                    "form",
                additional: {
                    form_id: form.id || null,
                    form_name: form.getAttribute("name") || null,
                    method: form.method || "get",
                },
            };

            trackAnalyticsEvent({ type: "form_start", metadata });
        };

        const handleSubmit = (event: SubmitEvent) => {
            if (!isAnalyticsTrackingEnabled()) {
                return;
            }

            const form = event.target as HTMLFormElement | null;
            if (!form || !form.matches("form[data-analytics-form]")) {
                return;
            }

            const metadata: AnalyticsMetadata = {
                interaction_target: form.dataset.analyticsTarget || buildElementSelector(form),
                interaction_label:
                    form.dataset.analyticsLabel ||
                    form.getAttribute("aria-label") ||
                    form.getAttribute("name") ||
                    form.id ||
                    "form",
                additional: {
                    form_id: form.id || null,
                    form_name: form.getAttribute("name") || null,
                    method: form.method || "get",
                    action: form.getAttribute("action") || null,
                    started: startedFormsRef.current?.has(form) ?? false,
                },
            };

            trackAnalyticsEvent({ type: "form_submit", metadata });
        };

        document.addEventListener("focusin", handleFocusIn);
        document.addEventListener("submit", handleSubmit);

        return () => {
            document.removeEventListener("focusin", handleFocusIn);
            document.removeEventListener("submit", handleSubmit);
        };
    }, [enabled]);
};

const useUnloadFlush = (enabled: boolean) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                void flushAnalyticsQueue({ useBeacon: true });
            }
        };

        const handleBeforeUnload = () => {
            void flushAnalyticsQueue({ useBeacon: true });
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [enabled]);
};

const AnalyticsTracker = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const searchString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
    const publicRoute = useMemo(() => isPublicPath(pathname), [pathname]);
    const scrollResetKey = useMemo(() => {
        const path = pathname ?? "__unknown__";
        return searchString ? `${path}?${searchString}` : path;
    }, [pathname, searchString]);
    const lastTrackedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (publicRoute) {
            enableAnalyticsTracking();
            return () => {
                disableAnalyticsTracking();
            };
        }

        disableAnalyticsTracking();
        return () => {
            disableAnalyticsTracking();
        };
    }, [publicRoute]);

    useEffect(() => {
        if (!publicRoute) {
            lastTrackedUrlRef.current = null;
            return;
        }

        const url = buildUrlFromParts(pathname ?? "", searchString);
        if (lastTrackedUrlRef.current === url) {
            return;
        }

        lastTrackedUrlRef.current = url;
        trackPageView(url);
    }, [pathname, publicRoute, searchString]);

    useScrollTracking(publicRoute, scrollResetKey);
    useCtaTracking(publicRoute);
    useFormTracking(publicRoute);
    useUnloadFlush(publicRoute);

    return null;
};

export default AnalyticsTracker;
