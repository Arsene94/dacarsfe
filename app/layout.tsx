import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import Script from "next/script";
import type { ReactNode } from "react";
import { BookingProvider } from "@/context/BookingProvider";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { DM_Sans, Poppins } from "next/font/google";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import { GlobalStyles } from "./global-styles";
import { AVAILABLE_LOCALES, LOCALE_STORAGE_KEY, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { MixpanelTracker } from "@/components/analytics/MixpanelTracker";


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

const FALLBACK_LOCALE = DEFAULT_LOCALE;
const cookieKeyPattern = LOCALE_STORAGE_KEY.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const supportedLocales = Array.from(AVAILABLE_LOCALES);

const localeBootstrapConfig = {
  storageKey: LOCALE_STORAGE_KEY,
  fallbackLocale: FALLBACK_LOCALE,
  cookiePattern: cookieKeyPattern,
  supportedLocales,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const bootstrapPayload = JSON.stringify(localeBootstrapConfig);

  return (
    <html
      lang={FALLBACK_LOCALE}
      data-locale={FALLBACK_LOCALE}
      className={`${poppins.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <GlobalStyles />
        <link
          rel="preload"
          as="image"
          href="/images/bg-hero-mobile-960x1759.webp"
          imageSrcSet="/images/bg-hero-mobile-378x284.webp 378w, /images/bg-hero-mobile-480x879.webp 480w, /images/bg-hero-mobile-960x1759.webp 960w"
          imageSizes="100vw"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="dns-prefetch" href="//vercel.app" />
        <link rel="dns-prefetch" href="//fe.dacars.ro" />
        <link rel="dns-prefetch" href="//backend.dacars.ro" />
        <link
          rel="preconnect"
          href="https://fe.dacars.ro"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://backend.dacars.ro"
          crossOrigin="anonymous"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
        <link
          rel="preload"
          as="image"
          href="/images/bg-hero-1920x1080.webp"
          media="(min-width: 640px)"
          imageSrcSet="/images/bg-hero-1920x1080.webp 1920w"
          imageSizes="100vw"
        />
      </head>
      <body className="min-h-screen bg-white">
        <MixpanelTracker scope="public" />
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
                var preferred = normalize(stored) || normalize(cookieLocale) || navigatorLocale || config.fallbackLocale;
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
        <LocaleProvider>
          <AuthProvider>
            <BookingProvider>
              <Header />
              <main>
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer />
            </BookingProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

