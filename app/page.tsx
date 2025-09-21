import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import {
    createOrganizationStructuredData,
    createRentalServiceStructuredData,
    resolveSiteUrl,
} from "@/lib/seo/structuredData";

const FALLBACK_DESCRIPTION =
    "Închiriază rapid mașini moderne de la DaCars în București și Otopeni. " +
    "Flotă variată, predare non-stop și oferte flexibile cu sau fără garanție.";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = resolveSiteUrl(rawSiteUrl);
const metadataBase = new URL(siteUrl);

export const metadata: Metadata = {
    metadataBase,
    title: {
        default: "DaCars Rent a Car | Închirieri auto rapide în București și Otopeni",
        template: "%s | DaCars Rent a Car",
    },
    description: FALLBACK_DESCRIPTION,
    keywords: [
        "închirieri auto București",
        "rent a car Otopeni",
        "mașini fără garanție",
        "închirieri auto aeroport",
        "flotă auto premium",
        "rezervare mașină online",
    ],
    category: "travel",
    authors: [{ name: "DaCars" }],
    creator: "DaCars",
    publisher: "DaCars",
    alternates: {
        canonical: siteUrl,
        languages: {
            "ro-RO": siteUrl,
        },
    },
    openGraph: {
        type: "website",
        url: siteUrl,
        title: "DaCars Rent a Car | Închirieri auto rapide în București și Otopeni",
        description: FALLBACK_DESCRIPTION,
        siteName: "DaCars Rent a Car",
        locale: "ro_RO",
        images: [
            {
                url: `${siteUrl}/images/logo-308x154.webp`,
                width: 308,
                height: 154,
                alt: "DaCars Rent a Car",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "DaCars Rent a Car",
        description: FALLBACK_DESCRIPTION,
        images: [`${siteUrl}/images/logo-308x154.webp`],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-video-preview": -1,
            "max-image-preview": "large",
        },
    },
};

const organizationStructuredData = createOrganizationStructuredData({
    name: "DaCars Rent a Car",
    url: siteUrl,
    logo: "/images/logo.svg",
    description: FALLBACK_DESCRIPTION,
    telephone: "+40 723 817 551",
    email: "contact@dacars.ro",
    sameAs: [
        "https://www.facebook.com/dacars.ro",
        "https://www.instagram.com/dacars.ro",
    ],
    address: {
        streetAddress: "Calea Bucureștilor 305",
        addressLocality: "Otopeni",
        addressRegion: "Ilfov",
        postalCode: "075100",
        addressCountry: "RO",
    },
    contactPoints: [
        {
            contactType: "customer support",
            telephone: "+40 723 817 551",
            areaServed: "RO",
            availableLanguage: ["ro", "en"],
            email: "contact@dacars.ro",
        },
    ],
    openingHours: [
        {
            dayOfWeek: [
                "https://schema.org/Monday",
                "https://schema.org/Tuesday",
                "https://schema.org/Wednesday",
                "https://schema.org/Thursday",
                "https://schema.org/Friday",
                "https://schema.org/Saturday",
                "https://schema.org/Sunday",
            ],
            opens: "00:00",
            closes: "23:59",
        },
    ],
});

const serviceStructuredData = createRentalServiceStructuredData({
    name: "DaCars Rent a Car",
    url: siteUrl,
    description: "Servicii complete de închirieri auto, cu predare 24/7 în București și Otopeni.",
    areaServed: ["RO", "BG", "HU"],
    priceRange: "25-150 EUR",
    serviceUrl: "/checkout",
});

const HomePage = () => {
    return (
        <>
            <JsonLd data={organizationStructuredData} id="dacars-organization" />
            <JsonLd data={serviceStructuredData} id="dacars-service" />
            <HomePageClient />
        </>
    );
};

export default HomePage;
