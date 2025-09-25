import type { Metadata } from "next";
import ContactSection from "@/components/ContactSection";
import JsonLd from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import {
    createBreadcrumbStructuredData,
    createOrganizationStructuredData,
} from "@/lib/seo/structuredData";

const CONTACT_TITLE = "Contact DaCars Rent a Car";
const CONTACT_DESCRIPTION =
    "Ai nevoie de ajutor pentru rezervarea mașinii? Contactează echipa DaCars telefonic," +
    " pe WhatsApp sau pe email. Suntem disponibili 24/7 în București și Otopeni.";

const contactMetadata = buildMetadata({
    title: `${CONTACT_TITLE} | Asistență 24/7 în București și Otopeni`,
    description: CONTACT_DESCRIPTION,
    keywords: [
        "contact DaCars",
        "închirieri auto contact",
        "telefon DaCars",
        "WhatsApp DaCars",
        "email închirieri auto",
    ],
    path: "/contact",
    openGraphTitle: `${CONTACT_TITLE} | Asistență 24/7 în București și Otopeni`,
});

export const metadata: Metadata = {
    ...contactMetadata,
};

const siteUrl = siteMetadata.siteUrl;
const contactPageUrl = absoluteUrl("/contact");

const organizationStructuredData = createOrganizationStructuredData({
    name: siteMetadata.siteName,
    url: siteUrl,
    logo: "/images/logo.svg",
    description: CONTACT_DESCRIPTION,
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

const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Acasă", item: siteUrl },
    { name: "Contact", item: contactPageUrl },
]);

const contactPageStructuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `${CONTACT_TITLE} | DaCars`,
    description: CONTACT_DESCRIPTION,
    url: contactPageUrl,
    mainEntity: {
        "@type": "AutoRental",
        name: siteMetadata.siteName,
        url: siteUrl,
        telephone: siteMetadata.contact.phone,
        email: siteMetadata.contact.email,
        address: {
            "@type": "PostalAddress",
            streetAddress: siteMetadata.address.street,
            addressLocality: siteMetadata.address.locality,
            addressRegion: siteMetadata.address.region,
            postalCode: siteMetadata.address.postalCode,
            addressCountry: siteMetadata.address.country,
        },
    },
};

const ContactPage = () => (
    <>
        <JsonLd data={organizationStructuredData} id="dacars-contact-organization" />
        {breadcrumbStructuredData && (
            <JsonLd data={breadcrumbStructuredData} id="dacars-contact-breadcrumb" />
        )}
        <JsonLd data={contactPageStructuredData} id="dacars-contact-page" />
        <ContactSection />
    </>
);

export default ContactPage;
