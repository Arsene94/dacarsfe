"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { useTranslations } from "@/lib/i18n/useTranslations";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { messages, t } = useTranslations("layout");

  const headerMessages = (messages.header ?? {}) as {
    menu?: Array<{ label?: string; href?: string; aria?: string }>;
    cta?: { label?: string; href?: string };
    mobileMenu?: { open?: string; close?: string };
  };

  const menuItems = headerMessages.menu?.filter((item) => Boolean(item?.label && item?.href)) ?? [];

  const cta = headerMessages.cta;
  const mobileMenuMessages = headerMessages.mobileMenu ?? {};
  const mobileToggleLabel = isMobileMenuOpen
    ? mobileMenuMessages.close ?? t('header.mobileMenu.close', { fallback: 'Închide meniul' })
    : mobileMenuMessages.open ?? t('header.mobileMenu.open', { fallback: 'Deschide meniul' });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-16 lg:h-20">
            <Link href="/" className="flex items-center space-x-2 group" aria-label="DaCars — închirieri auto rapide și oneste">
                    {/* Eager + fetchpriority=high ajută LCP pe homepage */}
                    <Image
                        src="/images/logo-308x154.webp"
                        className="relative w-auto"
                        alt="DaCars logo"
                        width={466}
                        height={154}
                        priority
                        loading="eager"
                        fetchPriority="high"
                    />
            </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {menuItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href ?? '#'}
                className="text-eefie font-dm-sans font-medium hover:text-jade transition-colors duration-300 relative group"
                aria-label={item.aria ?? item.label}
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-jade transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
            <LanguageSwitcher className="ml-4" />
          </nav>

          {/* CTA Button */}
            {/*<Link href="/checkout" aria-label="Rezervă acum">*/}
            {/*  <Button*/}
            {/*    aria-label="Rezervă acum"*/}
            {/*    className="hidden lg:inline-flex px-6 py-3 bg-jade text-white hover:bg-jade/90 transform hover:scale-105 shadow-lg hover:shadow-xl"*/}
            {/*  >*/}
            {/*    Rezervă acum*/}
            {/*  </Button>*/}
            {/*</Link>*/}

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-berkeley hover:bg-gray-100 transition-colors duration-300"
              aria-label={mobileToggleLabel}
              aria-expanded={isMobileMenuOpen}
            >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href ?? '#'}
                  className="block px-3 py-2 text-base font-dm-sans font-medium text-eefie hover:text-jade hover:bg-gray-50 rounded-md transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={item.aria ?? item.label}
                >
                  {item.label}
                </Link>
              ))}
                {cta?.label && cta?.href && (
                  <Link
                    href={cta.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label={cta.label}
                  >
                    <Button
                      aria-label={cta.label}
                      className="w-full mt-4 px-3 py-2 bg-jade text-white hover:bg-jade/90"
                    >
                      {cta.label}
                    </Button>
                  </Link>
                )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
