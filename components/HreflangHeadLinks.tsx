import { AVAILABLE_LOCALES, type Locale } from "@/lib/i18n/config";
import { ensureLocalePath } from "@/lib/i18n/routing";
import { getRequestedPathname } from "@/lib/seo/requestPath";
import { canonical } from "@/lib/seo/url";

const stripLocalePrefix = (pathname: string, locales: readonly Locale[]): string => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/";
  }

  const normalizedLocales = locales.map((entry) => entry.toLowerCase());
  const [first, ...rest] = segments;

  if (normalizedLocales.includes(first.toLowerCase() as Locale)) {
    return rest.length > 0 ? `/${rest.join("/")}` : "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
};

const HreflangHeadLinks = async () => {
  const pathname = await getRequestedPathname();
  const basePath = stripLocalePrefix(pathname, AVAILABLE_LOCALES);

  const alternates = AVAILABLE_LOCALES.map((locale) => ({
    locale,
    href: canonical(
      ensureLocalePath({ href: basePath, locale, availableLocales: AVAILABLE_LOCALES })
    ),
  }));

  const defaultHref = canonical(basePath);

  return (
    <>
      {alternates.map((alternate) => (
        <link
          key={`hreflang-${alternate.locale}`}
          rel="alternate"
          hrefLang={alternate.locale}
          href={alternate.href}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={defaultHref} />
    </>
  );
};

export default HreflangHeadLinks;
