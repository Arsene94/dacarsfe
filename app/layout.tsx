import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import ScrollPositionManager from "../components/ScrollPositionManager";
import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { BookingProvider } from "@/context/BookingProvider";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { DM_Sans, Poppins } from "next/font/google";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import { GlobalStyles } from "./global-styles";
import { AVAILABLE_LOCALES, LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import { resolveRequestLocale, getFallbackLocale } from "@/lib/i18n/serverLocale";
import MixpanelInitializer from "../components/MixpanelInitializer";
import TikTokPixelScript from "../components/TikTokPixelScript";
import MetaPixel from "../components/MetaPixel";
import MetaPixelServiceWorker from "../components/MetaPixelServiceWorker";
import { GoogleAnalytics } from "@next/third-parties/google";
import AnalyticsTracker from "../components/AnalyticsTracker";
import CampaignTrackingInitializer from "../components/CampaignTrackingInitializer";

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
    </head>
    <body className="min-h-screen bg-white">
    <Suspense fallback={null}>
        <CampaignTrackingInitializer />
        <MixpanelInitializer/>
        <MetaPixel />
        <MetaPixelServiceWorker />
        <AnalyticsTracker />
        </Suspense>
        <Script id="prefill-locale" strategy="beforeInteractive">
          {`
            (function() {
              var payload = ${bootstrapPayload};
              try {
                var config = typeof payload === 'string' ? JSON.parse(payload) : payload;
                var supported = Array.isArray(config.supportedLocales) ? config.supportedLocales : [];
                var isSupported = function(locale) {
                  if (typeof locale !== 'string' || locale.trim().length === 0) {
                    return false;
                  }
                  var lower = locale.toLowerCase();
                  if (supported.indexOf(lower) !== -1) {
                    return true;
                  }
                  var base = lower.split(/[-_]/)[0];
                  return supported.indexOf(base) !== -1;
                };
                var normalize = function(locale) {
                  if (!locale) return '';
                  var trimmed = locale.trim();
                  if (!trimmed) return '';
                  var lower = trimmed.toLowerCase();
                  if (isSupported(lower)) return lower;
                  var base = lower.split(/[-_]/)[0];
                  if (isSupported(base)) return base;
                  return '';
                };
                var stored = window.localStorage.getItem(config.storageKey);
                var cookieMatch = document.cookie.match(new RegExp('(?:^|; )' + config.cookiePattern + '=([^;]+)'));
                var cookieLocale = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
                var navigatorLocale = normalize(window.navigator.language || window.navigator.userLanguage || '');
                var initial = normalize(config.initialLocale);
                var preferred = normalize(stored) || normalize(cookieLocale) || navigatorLocale || initial || config.fallbackLocale;
                if (preferred) {
                  document.documentElement.lang = preferred;
                  document.documentElement.setAttribute('data-locale', preferred);
                  if (!stored || normalize(stored) !== preferred) {
                    try {
                      window.localStorage.setItem(config.storageKey, preferred);
                    } catch (storageError) {
                      console.warn('Nu am putut salva limba preferată în localStorage', storageError);
                    }
                  }
                  return;
                }
              } catch (error) {
                console.warn('Nu am putut citi limba salvată înainte de hidratare', error);
              }
              if (!document.documentElement.getAttribute('data-locale')) {
                document.documentElement.setAttribute('data-locale', '${FALLBACK_LOCALE}');
                document.documentElement.lang = '${FALLBACK_LOCALE}';
              }
            })();
          `}
        </Script>
        <LocaleProvider initialLocale={initialLocale}>
          <AuthProvider>
            <BookingProvider>
              <ScrollPositionManager />
              <Header />
              <main className="mt-12">
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer />
            </BookingProvider>
          </AuthProvider>
        </LocaleProvider>
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

