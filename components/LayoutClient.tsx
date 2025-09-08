'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import PageTransition from './PageTransition';

export default function LayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Header />}
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
      {!isAdmin && <Footer />}
    </>
  );
}

