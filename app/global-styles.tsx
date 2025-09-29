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

const asyncCssScript = `(() => {
  const link = document.querySelector('link[data-async-css="tailwind"]');
  if (!link || !(link instanceof HTMLLinkElement)) return;
  if (link.media === 'all') return;
  const critical = document.getElementById('critical-tailwind');
  const enable = () => {
    link.media = 'all';
    if (critical && critical.parentNode) {
      critical.parentNode.removeChild(critical);
    }
  };
  link.addEventListener('load', enable, { once: true });
  if (link.sheet) {
    enable();
  }
})();`;

const noscriptStyles = '<link rel="stylesheet" href="/tailwind.css" />';

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
        id="critical-tailwind"
        dangerouslySetInnerHTML={{ __html: inlineTailwindCss }}
      />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="preload" as="style" href="/tailwind.css" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/tailwind.css"
        media="print"
        data-async-css="tailwind"
      />
      <script dangerouslySetInnerHTML={{ __html: asyncCssScript }} />
      <noscript dangerouslySetInnerHTML={{ __html: noscriptStyles }} />
    </>
  );
}
