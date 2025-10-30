import fs from "node:fs";
import path from "node:path";
import type { JSX } from "react";
import Script from "next/script";

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
const INLINE_CACHE_MARKER = "tailwind-inline-cache";

const loadDeferredTailwindScript = `
  (function() {
    var href = '${TAILWIND_HREF}';
    var marker = '${INLINE_CACHE_MARKER}';
    var critical = document.getElementById('${CRITICAL_STYLE_ID}');

    var activateStylesheet = function(link) {
      if (!link) {
        return;
      }

      var finalize = function() {
        link.media = 'all';
        if (critical && critical.parentNode) {
          critical.parentNode.removeChild(critical);
        }
      };

      if (link.rel === 'preload') {
        link.rel = 'stylesheet';
        link.media = 'print';

        if (link.sheet) {
          finalize();
          return;
        }

        link.addEventListener('load', finalize, { once: true });
        link.addEventListener('error', finalize, { once: true });
        return;
      }

      link.addEventListener('load', finalize, { once: true });
    };

    var existingStylesheet = document.querySelector('link[rel="stylesheet"][data-inline-cache="' + marker + '"]');
    if (existingStylesheet) {
      activateStylesheet(existingStylesheet);
      return;
    }

    var preloadLink = document.querySelector('link[rel="preload"][as="style"][href="' + href + '"]');
    if (preloadLink) {
      preloadLink.setAttribute('data-inline-cache', marker);
      activateStylesheet(preloadLink);
      return;
    }

    var inject = function() {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = 'print';
      link.setAttribute('data-inline-cache', marker);

      activateStylesheet(link);

      if (critical && critical.parentNode) {
        critical.parentNode.insertBefore(link, critical.nextSibling);
      } else {
        (document.head || document.documentElement).appendChild(link);
      }
    };

    if (document.readyState === 'complete') {
      inject();
      return;
    }

    window.addEventListener('load', inject, { once: true });
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
      {/* Preload foaia completă pentru a începe descărcarea cât timp documentul este încă analizat */}
      <link
        rel="preload"
        as="style"
        href={TAILWIND_HREF}
        data-inline-cache={INLINE_CACHE_MARKER}
      />
      <Script
        id="defer-tailwind"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: loadDeferredTailwindScript }}
      />
      <noscript dangerouslySetInnerHTML={{ __html: noscriptStyles }} />
    </>
  );
}
