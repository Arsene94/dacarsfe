import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveOpenGraphLocale } from "@/lib/seo/metadata";
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

const trimTrailingSlash = (url: string): string => url.replace(/\/+$/, "");
const buildLocaleHref = (baseUrl: string, locale: Locale): string => {
  const normalizedBase = baseUrl ? trimTrailingSlash(baseUrl) : baseUrl;
  return `${normalizedBase}/${locale}`;
};

const uniqueLocales = (locales: readonly Locale[]): Locale[] => Array.from(new Set(locales));

type LocaleHeadTagsProps = {
  locale: Locale;
  languages?: readonly Locale[];
};

const LocaleHeadTags = ({ locale, languages = AVAILABLE_LOCALES }: LocaleHeadTagsProps) => {
  const dedupedLocales = uniqueLocales([locale, ...languages]);
  const baseUrl = trimTrailingSlash(siteMetadata.siteUrl);

  const languageName = LANGUAGE_NAMES[locale] ?? locale;
  const contentLanguage = CONTENT_LANGUAGE_MAP[locale] ?? locale;
  const openGraphLocale = resolveOpenGraphLocale(locale);

  const alternateLocales = dedupedLocales.filter((candidate) => candidate !== locale);

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
      <link rel="alternate" hrefLang="x-default" href={buildLocaleHref(baseUrl, DEFAULT_LOCALE)} />
      {dedupedLocales.map((entry) => (
        <link
          key={`alternate-${entry}`}
          rel="alternate"
          hrefLang={CONTENT_LANGUAGE_MAP[entry] ?? entry}
          href={buildLocaleHref(baseUrl, entry)}
        />
      ))}
    </>
  );
};

export default LocaleHeadTags;
