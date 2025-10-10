import fs from "node:fs";
import path from "node:path";
import type { JSX } from "react";

const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  void import("./globals.css");
}

const tailwindBundlePath = path.join(process.cwd(), "public", "tailwind.css");
let inlineTailwindCss: string | null = null;

if (isProduction) {
  try {
    inlineTailwindCss = fs.readFileSync(tailwindBundlePath, "utf8");
  } catch (error) {
    console.error("Nu s-a putut citi fișierul CSS optimizat:", error);
  }
}

const noscriptStyles = '<link rel="stylesheet" href="/tailwind.css" />';
const CRITICAL_STYLE_ID = "critical-tailwind";
const TAILWIND_HREF = "/tailwind.css";

const loadDeferredTailwindScript = `
  (function() {
    var href = '${TAILWIND_HREF}';
    var marker = 'tailwind-inline-cache';
    var existing = document.querySelector('link[data-inline-cache="' + marker + '"]');
    if (existing) {
      return;
    }

    var inject = function() {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = 'print';
      link.setAttribute('data-inline-cache', marker);

      var critical = document.getElementById('${CRITICAL_STYLE_ID}');

      link.addEventListener('load', function() {
        link.media = 'all';
        if (critical && critical.parentNode) {
          critical.parentNode.removeChild(critical);
        }
      }, { once: true });

      if (critical && critical.parentNode) {
        critical.parentNode.insertBefore(link, critical.nextSibling);
      } else {
        (document.head || document.documentElement).appendChild(link);
      }
    };

    var schedule = function() {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(function() {
          inject();
        }, { timeout: 3000 });
      } else {
        window.setTimeout(inject, 500);
      }
    };

    if (document.readyState === 'complete') {
      schedule();
      return;
    }

    window.addEventListener('load', schedule, { once: true });
  })();
`.trim();

export function GlobalStyles(): JSX.Element | null {
  if (!isProduction) {
    return null;
  }

  if (!inlineTailwindCss) {
    return (
      // eslint-disable-next-line @next/next/no-css-tags
      <link rel="stylesheet" href="/tailwind.css" />
    );
  }

  return (
    <>
      <style
        id={CRITICAL_STYLE_ID}
        dangerouslySetInnerHTML={{ __html: inlineTailwindCss }}
      />
      <script
        dangerouslySetInnerHTML={{ __html: loadDeferredTailwindScript }}
      />
      <noscript dangerouslySetInnerHTML={{ __html: noscriptStyles }} />
    </>
  );
}
