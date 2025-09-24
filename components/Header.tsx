"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { usePublicContentSection } from "@/context/PublicContentContext";
import { Button } from "@/components/ui/button";
import { HEADER_COPY_FALLBACK } from "@/lib/publicContent/defaults";

type NavItem = {
  label: string;
  href: string;
  ariaLabel: string;
};

const normalizeNavItems = (items: unknown): NavItem[] => {
  if (!Array.isArray(items)) {
    return HEADER_COPY_FALLBACK.navigation.items.map((item) => ({
      label: item.label,
      href: item.href,
      ariaLabel: item.ariaLabel ?? item.label,
    }));
  }

  const normalized: NavItem[] = [];
  items.forEach((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return;
    }
    const source = candidate as Record<string, unknown>;
    const rawLabel = source.label;
    const rawHref = source.href;
    if (typeof rawLabel !== "string" || rawLabel.trim().length === 0) {
      return;
    }
    if (typeof rawHref !== "string" || rawHref.trim().length === 0) {
      return;
    }
    const label = rawLabel.trim();
    const href = rawHref.trim();
    const ariaLabelSource = source.ariaLabel ?? source["aria-label"] ?? label;
    const ariaLabel =
      typeof ariaLabelSource === "string" && ariaLabelSource.trim().length > 0
        ? ariaLabelSource.trim()
        : label;
    normalized.push({ label, href, ariaLabel });
  });

  if (normalized.length === 0) {
    return HEADER_COPY_FALLBACK.navigation.items.map((item) => ({
      label: item.label,
      href: item.href,
      ariaLabel: item.ariaLabel ?? item.label,
    }));
  }

  return normalized;
};

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const copy = usePublicContentSection("header", HEADER_COPY_FALLBACK);

  const navItems = useMemo(
    () => normalizeNavItems(copy?.navigation?.items ?? undefined),
    [copy?.navigation?.items],
  );

  const mobileAriaOpen =
    (copy?.mobile?.openLabel as string | undefined) ??
    HEADER_COPY_FALLBACK.mobile.openLabel;
  const mobileAriaClose =
    (copy?.mobile?.closeLabel as string | undefined) ??
    HEADER_COPY_FALLBACK.mobile.closeLabel;

  const brandAria =
    (copy?.brandAria as string | undefined) ?? HEADER_COPY_FALLBACK.brandAria;

  const ctaConfig = {
    label:
      (copy?.cta?.label as string | undefined) ?? HEADER_COPY_FALLBACK.cta.label,
    ariaLabel:
      (copy?.cta?.ariaLabel as string | undefined) ??
      HEADER_COPY_FALLBACK.cta.ariaLabel,
    href:
      (copy?.cta?.href as string | undefined) ?? HEADER_COPY_FALLBACK.cta.href,
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-lg" : "bg-white/95 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center h-16 lg:h-20 overflow-hidden">
          <Link href="/" className="flex items-center space-x-2 group" aria-label={brandAria}>
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

          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="text-eefie font-dm-sans font-medium hover:text-jade transition-colors duration-300 relative group"
                aria-label={item.ariaLabel}
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-jade transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <LanguageSwitcher />
            <Link href={ctaConfig.href} aria-label={ctaConfig.ariaLabel}>
              <Button className="px-6 py-3 bg-jade text-white hover:bg-jade/90 transform hover:scale-105 shadow-lg hover:shadow-xl">
                {ctaConfig.label}
              </Button>
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            className="lg:hidden p-2 rounded-md text-berkeley hover:bg-gray-100 transition-colors duration-300"
            aria-label={isMobileMenuOpen ? mobileAriaClose : mobileAriaOpen}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-3 pt-3 pb-4 space-y-3">
              <LanguageSwitcher />
              {navItems.map((item) => (
                <Link
                  key={`mobile-${item.href}-${item.label}`}
                  href={item.href}
                  className="block px-3 py-2 text-base font-dm-sans font-medium text-eefie hover:text-jade hover:bg-gray-50 rounded-md transition-colors duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={item.ariaLabel}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={ctaConfig.href}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={ctaConfig.ariaLabel}
              >
                <Button className="w-full mt-2 px-3 py-2 bg-jade text-white hover:bg-jade/90">
                  {ctaConfig.label}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

