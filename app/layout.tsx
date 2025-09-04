import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import type { ReactNode } from "react";
import { BookingProvider } from "@/context/BookingContext";
import { DM_Sans, Poppins } from "next/font/google";

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

