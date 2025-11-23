import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import ScrollPositionManager from "../components/ScrollPositionManager";
import Script from "next/script";
import type { ReactNode } from "react";
import { BookingProvider } from "@/context/BookingProvider";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { DM_Sans, Poppins } from "next/font/google";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import { GlobalStyles } from "./global-styles";
import { AVAILABLE_LOCALES, LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import { resolveRequestLocale, getFallbackLocale } from "@/lib/i18n/serverLocale";
import TikTokPixelScript from "../components/TikTokPixelScript";
import MetaPixelHeadScripts from "../components/MetaPixelHeadScripts";
import { GoogleAnalytics } from "@next/third-parties/google";
import LocaleHeadTags from "../components/LocaleHeadTags";
import AnalyticsHydrator from "@/components/AnalyticsHydrator";
import { Analytics } from "@vercel/analytics/next"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const baseMetadata = buildMetadata({
  title: siteMetadata.defaultTitle,
  description: siteMetadata.description,
  keywords: siteMetadata.keywords,
  path: "/",
  openGraphTitle: siteMetadata.defaultTitle,
  twitterTitle: siteMetadata.defaultTitle,
});

export const metadata: Metadata = {
  ...baseMetadata,
  metadataBase: new URL(siteMetadata.siteUrl),
  title: {
    default: siteMetadata.defaultTitle,
    template: `%s | ${siteMetadata.siteName}`,
  },
  applicationName: siteMetadata.siteName,
  authors: [{ name: siteMetadata.siteName }],
  creator: siteMetadata.siteName,
  publisher: siteMetadata.siteName,
  icons: {
    icon: "/images/dacars-icon.png",
    apple: "/images/dacars-icon.png",
  },
};

const FALLBACK_LOCALE = getFallbackLocale();
const cookieKeyPattern = LOCALE_STORAGE_KEY.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const supportedLocales = Array.from(AVAILABLE_LOCALES);

const localeBootstrapConfig = {
  storageKey: LOCALE_STORAGE_KEY,
  fallbackLocale: FALLBACK_LOCALE,
  cookiePattern: cookieKeyPattern,
  supportedLocales,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initialLocale = await resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
  const bootstrapPayload = JSON.stringify({
    ...localeBootstrapConfig,
    initialLocale,
  });
  const localeBootstrapScript = `(()=>{try{const c=${bootstrapPayload};const list=(values)=>Array.isArray(values)?values.map((value)=>String(value||"").toLowerCase()).filter(Boolean):[];const supported=list(c.supportedLocales);const normalize=(raw)=>{if(!raw)return"";const lowered=String(raw).trim().toLowerCase();if(!lowered)return"";if(supported.includes(lowered))return lowered;const base=lowered.split(/[-_]/)[0];return supported.includes(base)?base:"";};const apply=(locale)=>{if(!locale)return;document.documentElement.lang=locale;document.documentElement.setAttribute("data-locale",locale);};const stored=window.localStorage.getItem(c.storageKey);const cookieMatch=document.cookie.match(new RegExp("(?:^|; )"+c.cookiePattern+"=([^;]+)"));const cookie=cookieMatch?decodeURIComponent(cookieMatch[1]):"";const nav=normalize(window.navigator.language||window.navigator.userLanguage);const fallback=normalize(c.fallbackLocale)||"${FALLBACK_LOCALE}";const preferred=normalize(c.initialLocale)||normalize(stored)||normalize(cookie)||nav||fallback;apply(preferred);if(preferred&&normalize(stored)!==preferred){try{window.localStorage.setItem(c.storageKey,preferred);}catch(e){}}if(!preferred){apply(fallback);}}catch(error){document.documentElement.setAttribute("data-locale","${FALLBACK_LOCALE}");document.documentElement.lang="${FALLBACK_LOCALE}";}})();`;

  return (
    <html
      lang={initialLocale}
      data-locale={initialLocale}
      className={`${poppins.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
    <head>
        <GlobalStyles/>
        <TikTokPixelScript/>
        <MetaPixelHeadScripts/>
        <GoogleAnalytics gaId="G-R1B5YS77GK"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link
            rel="preconnect"
            href="https://backend.dacars.ro"
            crossOrigin="anonymous"
        />

        <meta name="format-detection" content="telephone=no"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta httpEquiv="x-dns-prefetch-control" content="on"/>
        <LocaleHeadTags
          locale={initialLocale}
          languages={supportedLocales}
        />
    </head>
    <body className="min-h-screen bg-white">
        <Script
          id="prefill-locale"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: localeBootstrapScript }}
        />
        <LocaleProvider initialLocale={initialLocale}>
          <AuthProvider>
            <BookingProvider>
              <ScrollPositionManager />
              <Header />
              <main className="mt-12">
                <PageTransition>{children}</PageTransition>
                  <Analytics/>
              </main>
              <Footer />
            </BookingProvider>
          </AuthProvider>
        </LocaleProvider>
        <AnalyticsHydrator />
        <Script id="cookiescript-loader" strategy="lazyOnload">
          {`
            setTimeout(() => {
              const s = document.createElement("script");
              s.src = "https://cdn.cookie-script.com/s/1dbe1a6c3b981120922353311f510e1d.js";
              s.async = true;
              document.body.appendChild(s);
            }, 3000);
          `}
        </Script>
      </body>
    </html>
  );
}

