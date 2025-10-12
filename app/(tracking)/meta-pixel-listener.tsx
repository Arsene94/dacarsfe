"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MetaPixelListener = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedInitialRef = useRef(false);
  const lastTrackedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fbq !== "function") {
      return;
    }

    const search = searchParams?.toString();
    const url = `${pathname ?? ""}${search ? `?${search}` : ""}`;

    if (!hasTrackedInitialRef.current) {
      hasTrackedInitialRef.current = true;
      lastTrackedUrlRef.current = url;
      return;
    }

    if (lastTrackedUrlRef.current === url) {
      return;
    }

    lastTrackedUrlRef.current = url;
    window.fbq("track", "PageView");
  }, [pathname, searchParams]);

  return null;
};

export default MetaPixelListener;
