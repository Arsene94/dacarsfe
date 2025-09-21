import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/meta";
import { siteMetadata } from "@/lib/seo/siteMetadata";
import {
    createOrganizationStructuredData,
    createRentalServiceStructuredData,
} from "@/lib/seo/structuredData";

const FALLBACK_DESCRIPTION =
    "Închiriază rapid mașini moderne de la DaCars în București și Otopeni. " +
    "Flotă variată, predare non-stop și oferte flexibile cu sau fără garanție.";

const siteUrl = siteMetadata.siteUrl;

const homeMetadata = buildMetadata({
    title: "Închirieri auto rapide în București și Otopeni",
    description: FALLBACK_DESCRIPTION,
    keywords: [
        "închirieri auto București",
        "rent a car Otopeni",
        "mașini fără garanție",
        "închirieri auto aeroport",
        "flotă auto premium",
        "rezervare mașină online",
    ],
    path: "/",
    openGraphTitle: "DaCars Rent a Car – Închirieri auto rapide în București și Otopeni",
});

export const metadata: Metadata = {
    ...homeMetadata,
    alternates: {
        canonical: siteUrl,
        languages: {
            "ro-RO": siteUrl,
        },
    },
    category: "travel",
    authors: [{ name: siteMetadata.siteName }],
    creator: siteMetadata.siteName,
    publisher: siteMetadata.siteName,
};

const organizationStructuredData = createOrganizationStructuredData({
    name: siteMetadata.siteName,
    url: siteUrl,
    logo: "/images/logo.svg",
    description: FALLBACK_DESCRIPTION,
    telephone: siteMetadata.contact.phone,
    email: siteMetadata.contact.email,
    sameAs: [...siteMetadata.socialProfiles],
    address: {
        streetAddress: siteMetadata.address.street,
        addressLocality: siteMetadata.address.locality,
        addressRegion: siteMetadata.address.region,
        postalCode: siteMetadata.address.postalCode,
        addressCountry: siteMetadata.address.country,
    },
    contactPoints: [
        {
            contactType: "customer support",
            telephone: siteMetadata.contact.phone,
            areaServed: "RO",
            availableLanguage: ["ro", "en"],
            email: siteMetadata.contact.email,
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
    name: siteMetadata.siteName,
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
