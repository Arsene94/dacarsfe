"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type DeferredHydrationProps = {
    children: ReactNode | (() => ReactNode);
    /**
     * Intervalul maxim (în milisecunde) după care montăm componenta
     * chiar dacă `requestIdleCallback` nu a rulat încă.
     */
    timeout?: number;
};

const DEFAULT_TIMEOUT = 2000;

const DeferredHydration = ({ children, timeout = DEFAULT_TIMEOUT }: DeferredHydrationProps) => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const win = window as typeof window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        let didRun = false;

        const run = () => {
            if (!didRun) {
                didRun = true;
                setIsReady(true);
            }
        };

        const idleHandle = typeof win.requestIdleCallback === "function"
            ? win.requestIdleCallback(() => run(), { timeout })
            : null;

        const timeoutHandle = window.setTimeout(run, timeout);

        return () => {
            if (idleHandle !== null) {
                win.cancelIdleCallback?.(idleHandle);
            }
            window.clearTimeout(timeoutHandle);
        };
    }, [timeout]);

    const content = useMemo(() => {
        if (!isReady) {
            return null;
        }

        return typeof children === "function" ? children() : children;
    }, [children, isReady]);

    return <>{content}</>;
};

export default DeferredHydration;
