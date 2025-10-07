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
const TAILWIND_ASYNC_ATTR = "tailwind-preload";

const enableAsyncTailwindScript = `
  (function() {
    var link = document.querySelector('link[data-async-css="${TAILWIND_ASYNC_ATTR}"]');
    if (!link) {
      return;
    }

    var critical = document.getElementById('${CRITICAL_STYLE_ID}');

    var enableStylesheet = function() {
      if (!link) {
        return;
      }

      if (link.rel !== 'stylesheet') {
        try {
          link.rel = 'stylesheet';
        } catch (error) {
          link.setAttribute('rel', 'stylesheet');
        }
      }

      if (link.hasAttribute('as')) {
        link.removeAttribute('as');
      }

      if (link.dataset && Object.prototype.hasOwnProperty.call(link.dataset, 'asyncCss')) {
        try {
          delete link.dataset.asyncCss;
        } catch (error) {
          link.removeAttribute('data-async-css');
        }
      } else {
        link.removeAttribute('data-async-css');
      }

      if (critical && critical.parentNode) {
        critical.parentNode.removeChild(critical);
      }
    };

    if (link.rel === 'stylesheet') {
      enableStylesheet();
      return;
    }

    var finalize = function() {
      enableStylesheet();
    };

    link.addEventListener('load', finalize, { once: true });
    link.addEventListener('error', finalize, { once: true });

    if (link.sheet) {
      enableStylesheet();
      return;
    }

    window.setTimeout(enableStylesheet, 3000);
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
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="preload"
        as="style"
        href="/tailwind.css"
        data-async-css={TAILWIND_ASYNC_ATTR}
      />
      <script
        dangerouslySetInnerHTML={{ __html: enableAsyncTailwindScript }}
      />
      <noscript dangerouslySetInnerHTML={{ __html: noscriptStyles }} />
    </>
  );
}
