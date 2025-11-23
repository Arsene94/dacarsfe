import { AVAILABLE_LOCALES } from "@/lib/i18n/config";
import { normalizeLocaleCandidate } from "@/lib/i18n/localeDetection";
import { ensureLocalePath } from "@/lib/i18n/routing";
import { getRequestedLocale, getRequestedPathname } from "@/lib/seo/requestPath";
import { canonical } from "@/lib/seo/url";

const CanonicalHeadLink = async () => {
  const [pathname, rawLocale] = await Promise.all([
    getRequestedPathname(),
    getRequestedLocale(),
  ]);

  const locale = normalizeLocaleCandidate(rawLocale ?? undefined);
  const localizedPath = locale
    ? ensureLocalePath({
        href: pathname,
        locale,
        availableLocales: AVAILABLE_LOCALES,
      })
    : pathname;

  const href = canonical(localizedPath);

  return <link rel="canonical" href={href} />;
};

export default CanonicalHeadLink;
