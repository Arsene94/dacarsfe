import { resolveSiteUrl } from "@/lib/seo/structuredData";

/**
 * URL-ul canonic de bază folosit în tot proiectul pentru construirea link-urilor absolute.
 */
export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const DEFAULT_LOCALE = "ro-RO" as const;
export const FALLBACK_HREFLANGS = ["ro", "en", "ro-RO"] as const;
