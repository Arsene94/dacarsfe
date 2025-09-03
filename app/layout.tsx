import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import type { ReactNode } from "react";

export const metadata = {
  title: 'DaCars',
  description: 'Mașini oneste pentru români onești',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body className="min-h-screen bg-white">
        <Header />
        <main>
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </body>
    </html>
  );
}

