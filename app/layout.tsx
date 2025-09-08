import type { ReactNode } from "react";
import { BookingProvider } from "@/context/BookingContext";
import { AuthProvider } from "@/context/AuthContext";
import { DM_Sans, Poppins } from "next/font/google";
import "./globals.css";
import LayoutClient from "../components/LayoutClient";

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
      </head>
      <body className="min-h-screen bg-white">
        <AuthProvider>
          <BookingProvider>
            <LayoutClient>{children}</LayoutClient>
          </BookingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

