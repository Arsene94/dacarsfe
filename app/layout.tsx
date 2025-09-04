import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import type { ReactNode } from "react";
import { BookingProvider } from "@/context/BookingContext";
import { DM_Sans, Poppins } from "next/font/google";
import AsyncStyles from "@/components/AsyncStyles";

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

export const metadata = {
  title: 'DaCars',
  description: 'Mașini oneste pentru români onești',
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
        <link
          rel="preload"
          as="image"
          href="/images/bg-hero-1920x1080.webp"
          media="(min-width: 640px)"
        />
        <AsyncStyles />
      </head>
      <body className="min-h-screen bg-white">
        <BookingProvider>
          <Header />
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </BookingProvider>
      </body>
    </html>
  );
}

