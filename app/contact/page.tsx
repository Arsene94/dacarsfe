import type { Metadata } from "next";
import ContactSection from "@/components/ContactSection";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/meta";
import { contactPage, breadcrumb } from "@/lib/seo/jsonld";
import { siteMetadata } from "@/lib/seo/siteMetadata";

type ContactSeoCopy = {
    metaTitle: string;
    pageDescription: string;
    breadcrumbHome: string;
    breadcrumbContact: string;
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

const CONTACT_SEO_COPY: Record<Locale, ContactSeoCopy> = {
    ro: {
        metaTitle: `Contact | ${SITE_NAME}`,
        pageDescription:
            "Contactează specialiștii DaCars prin telefon, WhatsApp sau e-mail și primești răspuns personalizat în maximum o zi lucrătoare.",
        breadcrumbHome: "Acasă",
        breadcrumbContact: "Contact",
    },
    en: {
        metaTitle: `Contact | ${SITE_NAME}`,
        pageDescription:
            "Reach our rental specialists via phone, WhatsApp, or email for a tailored reply within one business day.",
        breadcrumbHome: "Home",
        breadcrumbContact: "Contact",
    },
    it: {
        metaTitle: `Contatto | ${SITE_NAME}`,
        pageDescription:
            "Parla con i consulenti DaCars via telefono, WhatsApp o e-mail e ricevi una risposta personalizzata entro un giorno lavorativo.",
        breadcrumbHome: "Pagina iniziale",
        breadcrumbContact: "Contatto",
    },
    es: {
        metaTitle: `Contacto | ${SITE_NAME}`,
        pageDescription:
            "Escribe a los especialistas DaCars por teléfono, WhatsApp o correo y recibe respuesta personalizada en un día hábil.",
        breadcrumbHome: "Inicio",
        breadcrumbContact: "Contacto",
    },
    fr: {
        metaTitle: `Contact | ${SITE_NAME}`,
        pageDescription:
            "Contactez les spécialistes DaCars par téléphone, WhatsApp ou e-mail pour une réponse personnalisée sous un jour ouvré.",
        breadcrumbHome: "Accueil",
        breadcrumbContact: "Contact",
    },
    de: {
        metaTitle: `Kontakt | ${SITE_NAME}`,
        pageDescription:
            "Erreiche die DaCars-Spezialisten per Telefon, WhatsApp oder E-Mail und erhalte innerhalb eines Werktags eine persönliche Antwort.",
        breadcrumbHome: "Startseite",
        breadcrumbContact: "Kontakt",
    },
};

const resolveContactSeo = async () => {
    const locale = await resolveRequestLocale();
    const copy = CONTACT_SEO_COPY[locale] ?? CONTACT_SEO_COPY[FALLBACK_LOCALE];
    return { locale, copy };
};

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = await resolveContactSeo();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.pageDescription,
        path: "/contact",
        hreflangLocales: HREFLANG_LOCALES,
        locale,
    });
}

const ContactPage = async () => {
    const { copy } = await resolveContactSeo();
    const structuredData = [
        contactPage({
            name: copy.metaTitle,
            description: copy.pageDescription,
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
            { name: copy.breadcrumbHome, url: SITE_URL },
            { name: copy.breadcrumbContact, url: `${SITE_URL}/contact` },
        ]),
    ];

    return (
        <>
            <StructuredData data={structuredData} id="contact-structured-data" />
            <ContactSection />
        </>
    );
};

export default ContactPage;
