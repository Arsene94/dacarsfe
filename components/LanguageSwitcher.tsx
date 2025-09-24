"use client";

import { useMemo, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { usePublicContent, usePublicContentSection } from "@/context/PublicContentContext";
import {
  SUPPORTED_PUBLIC_LOCALES,
  isSupportedPublicLocale,
} from "@/lib/publicContent/config";
import type { PublicLocale } from "@/types/public-content";

import { LANGUAGE_SWITCHER_FALLBACK } from "@/lib/publicContent/defaults";

const LanguageSwitcher = () => {
  const { locale, setLocale, isLoading } = usePublicContent();
  const copy = usePublicContentSection(
    "header.languageSwitcher",
    LANGUAGE_SWITCHER_FALLBACK,
  );
  const [isPending, startTransition] = useTransition();

  const options = useMemo(() => SUPPORTED_PUBLIC_LOCALES, []);

  const handleChange = (value: string) => {
    if (!value || value === locale) {
      return;
    }

    const normalized = isSupportedPublicLocale(value)
      ? (value as PublicLocale)
      : (value.trim() as PublicLocale);

    startTransition(() => {
      setLocale(normalized);
    });
  };

  const ariaLabel = copy.ariaLabel ?? copy.label ?? LANGUAGE_SWITCHER_FALLBACK.label;

  return (
    <div className="min-w-[120px]">
      <label htmlFor="dacars-language-switcher" className="sr-only">
        {ariaLabel}
      </label>
      <Select
        id="dacars-language-switcher"
        className="w-full bg-white/80 text-sm"
        value={locale}
        aria-label={ariaLabel}
        onValueChange={handleChange}
        disabled={isLoading || isPending}
      >
        {options.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.label}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default LanguageSwitcher;

