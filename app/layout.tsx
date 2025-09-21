import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import type { ReactNode } from "react";
import { BookingProvider } from "@/context/BookingContext";
import { AuthProvider } from "@/context/AuthContext";
import { DM_Sans, Poppins } from "next/font/google";
import { resolveSiteUrl } from "@/lib/seo/structuredData";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = resolveSiteUrl(rawSiteUrl);

const BASE_DESCRIPTION =
  "Platformă de închirieri auto DaCars – flotă completă, predare 24/7 și oferte flexibile în București și Otopeni.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DaCars Rent a Car | Mașini oneste pentru români onești",
    template: "%s | DaCars Rent a Car",
  },
  description: BASE_DESCRIPTION,
  applicationName: "DaCars Rent a Car",
  keywords: [
    "închirieri auto",
    "rent a car",
    "Otopeni",
    "București",
    "mașini fără garanție",
    "rezervare mașină",
  ],
  authors: [{ name: "DaCars" }],
  creator: "DaCars",
  publisher: "DaCars",
  icons: {
    icon: "/images/dacars-icon.png",
    apple: "/images/dacars-icon.png",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "DaCars Rent a Car | Mașini oneste pentru români onești",
    description: BASE_DESCRIPTION,
    locale: "ro_RO",
    siteName: "DaCars Rent a Car",
    images: [
      {
        url: `${siteUrl}/images/logo-308x154.webp`,
        width: 308,
        height: 154,
        alt: "DaCars Rent a Car",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DaCars Rent a Car",
    description: BASE_DESCRIPTION,
    images: [`${siteUrl}/images/logo-308x154.webp`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      maxSnippet: -1,
      maxVideoPreview: -1,
      maxImagePreview: "large",
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro" className={`${poppins.variable} ${dmSans.variable}`}>
      <head>
        <link
          rel="preload"
          as="image"
          href="/images/bg-hero-mobile.webp"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="dns-prefetch" href="//vercel.app" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta httpEquiv="x-dns-prefetch-control" content="on" />
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link
          rel="preload"
          as="image"
          href="/images/bg-hero-1920x1080.webp"
          media="(min-width: 640px)"
        />
      </head>
      <body className="min-h-screen bg-white">
        <AuthProvider>
          <BookingProvider>
            <Header />
            <main>
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </BookingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

