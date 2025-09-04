"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PageTransitionProps } from "@/types/page";

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayedPath, setDisplayedPath] = useState(pathname);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [opacityClass, setOpacityClass] = useState("opacity-100");

  useEffect(() => {
    if (pathname === displayedPath) {
      setDisplayedChildren(children);
      return;
    }

    setOpacityClass("opacity-0");
    const timeout = setTimeout(() => {
      setDisplayedPath(pathname);
      setDisplayedChildren(children);
      setOpacityClass("opacity-100");
    }, 150);

    return () => clearTimeout(timeout);
  }, [pathname, children, displayedPath]);

  return (
    <div className={`transition-opacity duration-150 ${opacityClass}`}>
      {displayedChildren}
    </div>
  );
}

