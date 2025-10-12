"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_PREFIX = "dacars:scroll:";

const isBrowser = typeof window !== "undefined";

const buildStorageKey = (pathname: string, searchParams: string) =>
  `${STORAGE_PREFIX}${pathname}${searchParams ? `?${searchParams}` : ""}`;

export default function ScrollPositionManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch (error) {
      console.warn("Nu am putut seta scrollRestoration manual", error);
    }
  }, []);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const currentKey = buildStorageKey(pathname, searchParams.toString());
    const previousKey = lastKeyRef.current;

    if (previousKey && previousKey !== currentKey) {
      try {
        sessionStorage.setItem(previousKey, String(window.scrollY));
      } catch (error) {
        console.warn("Nu am putut salva poziția de scroll", error);
      }
    }

    lastKeyRef.current = currentKey;

    let stored = "";
    try {
      stored = sessionStorage.getItem(currentKey) ?? "";
    } catch (error) {
      console.warn("Nu am putut citi poziția de scroll salvată", error);
    }

    const target = Number.parseInt(stored, 10);
    const top = Number.isFinite(target) ? target : 0;

    const restore = () => {
      window.scrollTo({ top });
    };

    if (document.readyState === "complete") {
      requestAnimationFrame(restore);
    } else {
      const handleLoad = () => {
        requestAnimationFrame(restore);
      };
      window.addEventListener("load", handleLoad, { once: true });
      return () => window.removeEventListener("load", handleLoad);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const handleBeforeUnload = () => {
      const key = lastKeyRef.current;
      if (!key) {
        return;
      }
      try {
        sessionStorage.setItem(key, String(window.scrollY));
      } catch (error) {
        console.warn("Nu am putut salva scroll-ul la unload", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return null;
}
