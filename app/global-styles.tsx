import type { JSX } from "react";

const isProduction = process.env.NODE_ENV === "production";
const isEdgeRuntime = process.env.NEXT_RUNTIME === "edge";

if (!isProduction) {
  void import("./globals.css");
}

const shouldInlineTailwind = isProduction && !isEdgeRuntime;

async function loadInlineTailwindCss(): Promise<string | null> {
  try {
    const loadModule = new Function(
      "specifier",
      "return import(specifier);",
    ) as (specifier: string) => Promise<unknown>;

    const fsPromisesSpecifier = `${"node"}:${["fs", "promises"].join("/")}`;
    const pathSpecifier = `${"node"}:${"path"}`;

    const [fsModule, pathModule] = await Promise.all([
      loadModule(fsPromisesSpecifier),
      loadModule(pathSpecifier),
    ]);

    const { readFile } = fsModule as typeof import("node:fs/promises");
    const { join } = pathModule as typeof import("node:path");

    const tailwindBundlePath = join(process.cwd(), "public", "tailwind.css");
    return await readFile(tailwindBundlePath, "utf8");
  } catch (error) {
    console.error("Nu s-a putut citi fișierul CSS optimizat:", error);
    return null;
  }
}

const inlineTailwindCssPromise = shouldInlineTailwind
  ? loadInlineTailwindCss()
  : Promise.resolve<string | null>(null);

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

export async function GlobalStyles(): Promise<JSX.Element | null> {
  if (!isProduction) {
    return null;
  }

  const inlineTailwindCss = await inlineTailwindCssPromise;

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
