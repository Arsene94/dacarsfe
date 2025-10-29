import { headers } from "next/headers";

import { AVAILABLE_LOCALES, type Locale } from "@/lib/i18n/config";
import { resolveOpenGraphLocale } from "@/lib/seo/metadata";
import { hreflangLinks } from "@/lib/seo/url";
import { siteMetadata } from "@/lib/seo/siteMetadata";

const LANGUAGE_NAMES: Record<Locale, string> = {
  ro: "Română",
  en: "English",
  it: "Italiană",
  es: "Spaniolă",
  fr: "Franceză",
  de: "Germană",
};

const CONTENT_LANGUAGE_MAP: Record<Locale, string> = {
  ro: "ro-RO",
  en: "en-US",
  it: "it-IT",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

const uniqueLocales = (locales: readonly Locale[]): Locale[] => Array.from(new Set(locales));

const ensureLeadingSlash = (value: string): string => {
  if (!value) {
    return "/";
  }

  return value.startsWith("/") ? value : `/${value}`;
};

const resolveRequestPathname = (explicitPath?: string): string => {
  if (explicitPath && explicitPath.trim().length > 0) {
    return ensureLeadingSlash(explicitPath.trim());
  }

  try {
    const headerList = headers();
    const headerCandidates = [
      headerList.get("x-dacars-pathname"),
      headerList.get("x-next-url"),
      headerList.get("next-url"),
    ];

    for (const candidate of headerCandidates) {
      if (!candidate) {
        continue;
      }

      try {
        if (candidate.includes("://")) {
          const url = new URL(candidate);
          return url.pathname || "/";
        }

        return ensureLeadingSlash(candidate);
      } catch {
        continue;
      }
    }
  } catch {
    // Ignorăm erorile și cădem pe fallback.
  }

  return "/";
};

type LocaleHeadTagsProps = {
  locale: Locale;
  languages?: readonly Locale[];
  pathname?: string;
};

const LocaleHeadTags = ({ locale, languages = AVAILABLE_LOCALES, pathname }: LocaleHeadTagsProps) => {
  const dedupedLocales = uniqueLocales([locale, ...languages]);
  const languageName = LANGUAGE_NAMES[locale] ?? locale;
  const contentLanguage = CONTENT_LANGUAGE_MAP[locale] ?? locale;
  const openGraphLocale = resolveOpenGraphLocale(locale);
  const alternateLocales = dedupedLocales.filter((candidate) => candidate !== locale);
  const requestPathname = resolveRequestPathname(pathname);
  const alternates = hreflangLinks(requestPathname, dedupedLocales);
  const normalizedSiteUrl = siteMetadata.siteUrl.replace(/\/+$/, "");

  return (
    <>
      <meta name="language" content={languageName} />
      <meta httpEquiv="content-language" content={contentLanguage} />
      <meta property="og:locale" content={openGraphLocale} />
      {alternateLocales.map((alternate) => (
        <meta
          key={`og-alternate-${alternate}`}
          property="og:locale:alternate"
          content={resolveOpenGraphLocale(alternate)}
        />
      ))}
      {alternates.map((alternate) => {
        const href = alternate.href.startsWith("http")
          ? alternate.href
          : `${normalizedSiteUrl}${ensureLeadingSlash(alternate.href)}`;

        return (
          <link
            key={`alternate-${alternate.hrefLang}`}
            rel="alternate"
            hrefLang={alternate.hrefLang}
            href={href}
          />
        );
      })}
    </>
  );
};

export default LocaleHeadTags;
