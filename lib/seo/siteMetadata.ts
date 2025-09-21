import { ensureAbsoluteUrl, resolveSiteUrl } from "@/lib/seo/structuredData";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = resolveSiteUrl(rawSiteUrl);

const DEFAULT_SOCIAL_IMAGE = {
    src: "/images/bg-hero-1920x1080.webp",
    width: 1920,
    height: 1080,
    alt: "Flota DaCars pregătită pentru închiriere",
};

export const siteMetadata = {
    siteUrl,
    siteName: "DaCars Rent a Car",
    defaultTitle: "DaCars Rent a Car | Mașini oneste pentru români onești",
    description:
        "Platformă de închirieri auto DaCars – flotă completă, predare 24/7 și oferte flexibile în București și Otopeni.",
    keywords: [
        "închirieri auto",
        "rent a car",
        "Otopeni",
        "București",
        "mașini fără garanție",
        "rezervare mașină",
    ],
    locale: "ro_RO",
    contact: {
        phone: "+40 723 817 551",
        email: "contact@dacars.ro",
    },
    address: {
        street: "Calea Bucureștilor 305",
        locality: "Otopeni",
        region: "Ilfov",
        postalCode: "075100",
        country: "RO",
    },
    socialProfiles: [
        "https://www.facebook.com/dacars.ro",
        "https://www.instagram.com/dacars.ro",
    ],
    defaultSocialImage: DEFAULT_SOCIAL_IMAGE,
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
        },
    } as const,
} as const;

export const absoluteUrl = (path = "/"): string => ensureAbsoluteUrl(path, siteUrl);
