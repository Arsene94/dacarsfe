import type { Metadata } from "next";
import ContactSection from "@/components/ContactSection";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { buildMetadata } from "@/lib/seo/meta";
import { contactPage, breadcrumb } from "@/lib/seo/jsonld";
import { siteMetadata } from "@/lib/seo/siteMetadata";

const PAGE_TITLE = `Contact | ${SITE_NAME}`;
const PAGE_DESCRIPTION =
    "Contact our rental specialists via phone, WhatsApp, or email for a tailored response within one business day.";

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        path: "/contact",
        hreflangLocales: ["en", "ro"],
    });
}

const structuredData = [
    contactPage({
        name: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        url: `${SITE_URL}/contact`,
        contactPoint: [
            {
                telephone: siteMetadata.contact.phone,
                contactType: "customer support",
                areaServed: "EU",
                availableLanguage: ["en", "ro"],
                email: siteMetadata.contact.email,
            },
        ],
    }),
    breadcrumb([
        { name: "Home", url: SITE_URL },
        { name: "Contact", url: `${SITE_URL}/contact` },
    ]),
];

const ContactPage = () => (
    <>
        <StructuredData data={structuredData} id="contact-structured-data" />
        <ContactSection />
    </>
);

export default ContactPage;
