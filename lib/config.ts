export const SITE_URL = "https://dacars.ro" as const;
export const SITE_NAME = "DaCars" as const;
export const SITE_LOCALE = "en_US" as const;
export const SITE_TWITTER = "@example" as const;
export const ORG_LOGO_URL = `${SITE_URL}/logo.png` as const;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg` as const;
export const ORG_SAME_AS = [
    "https://www.facebook.com/dacars.ro",
    "https://www.instagram.com/dacarsro/",
    "https://www.tiktok.com/@dacarsrentacar",
] as const;

// Exporturi legacy păstrate pentru compatibilitatea codului existent.
export const DEFAULT_LOCALE = "ro-RO" as const;
export const FALLBACK_HREFLANGS = ["ro", "en", "ro-RO"] as const;
