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
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/config";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ro"
      data-locale="ro"
      className={`${poppins.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <GlobalStyles />
        <link
          rel="preload"
          as="image"
          href="/images/bg-hero-mobile.webp"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="dns-prefetch" href="//vercel.app" />
        <link rel="dns-prefetch" href="//fe.dacars.ro" />
        <link rel="dns-prefetch" href="//backend.dacars.ro" />
        <link rel="dns-prefetch" href="//images.pexels.com" />
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
        <link rel="preconnect" href="https://images.pexels.com" />
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
        />
      </head>
      <body className="min-h-screen bg-white">
        <Script id="prefill-locale" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var stored = window.localStorage.getItem('${LOCALE_STORAGE_KEY}');
                if (stored) {
                  document.documentElement.lang = stored;
                  document.documentElement.setAttribute('data-locale', stored);
                  return;
                }
              } catch (error) {
                console.warn('Nu am putut citi limba salvată înainte de hidratare', error);
              }
              var current = document.documentElement.getAttribute('data-locale');
              if (!current) {
                document.documentElement.setAttribute('data-locale', 'ro');
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

