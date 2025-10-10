import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";

export type DocsSeoCopy = {
    pageTitle: string;
    pageDescription: string;
    metaTitle: string;
    metaDescription: string;
    breadcrumbHome: string;
    breadcrumbDocs: string;
    sectionLabel: string;
    notFoundTitle: string;
    notFoundDescription: string;
};

export const DOCS_HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;

const DOCS_SEO_COPY: Record<Locale, DocsSeoCopy> = {
    ro: {
        pageTitle: "Documentație clienți DaCars",
        pageDescription:
            "Ghiduri prietenoase pentru clienții DaCars despre cum rezervi, ridici și folosești mașinile în siguranță.",
        metaTitle: "Ghid clienți DaCars | Rezervare, ridicare, suport",
        metaDescription:
            "Ghiduri prietenoase pentru clienții DaCars despre cum rezervi, ridici și folosești mașinile în siguranță.",
        breadcrumbHome: "Acasă",
        breadcrumbDocs: "Ghiduri clienți",
        sectionLabel: "Ghid clienți",
        notFoundTitle: "Pagina nu a fost găsită | DaCars",
        notFoundDescription: "Documentația solicitată nu există sau a fost mutată.",
    },
    en: {
        pageTitle: "DaCars Customer Guides",
        pageDescription:
            "Friendly guides that explain how to book, pick up and enjoy your DaCars rental with confidence.",
        metaTitle: "DaCars Customer Guides | Booking, Pickup & Support",
        metaDescription:
            "Friendly guides that explain how to book, pick up and enjoy your DaCars rental with confidence.",
        breadcrumbHome: "Home",
        breadcrumbDocs: "Customer guides",
        sectionLabel: "Customer guides",
        notFoundTitle: "Page not found | DaCars",
        notFoundDescription: "The requested documentation page is no longer available.",
    },
    it: {
        pageTitle: "Guide clienti DaCars",
        pageDescription:
            "Guide intuitive per i clienti DaCars su prenotazione, ritiro e utilizzo in sicurezza dell'auto noleggiata.",
        metaTitle: "Guide clienti DaCars | Prenotazione, ritiro, assistenza",
        metaDescription:
            "Guide intuitive per i clienti DaCars su prenotazione, ritiro e utilizzo in sicurezza dell'auto noleggiata.",
        breadcrumbHome: "Pagina iniziale",
        breadcrumbDocs: "Guide clienti",
        sectionLabel: "Guide clienti",
        notFoundTitle: "Pagina non trovata | DaCars",
        notFoundDescription: "La pagina di documentazione richiesta non è più disponibile.",
    },
    es: {
        pageTitle: "Guías para clientes DaCars",
        pageDescription:
            "Guías claras para clientes DaCars sobre cómo reservar, recoger y aprovechar al máximo el coche de alquiler.",
        metaTitle: "Guías para clientes DaCars | Reserva, recogida y soporte",
        metaDescription:
            "Guías claras para clientes DaCars sobre cómo reservar, recoger y aprovechar al máximo el coche de alquiler.",
        breadcrumbHome: "Inicio",
        breadcrumbDocs: "Guías para clientes",
        sectionLabel: "Guías para clientes",
        notFoundTitle: "Página no encontrada | DaCars",
        notFoundDescription: "La página de documentación solicitada ya no está disponible.",
    },
    fr: {
        pageTitle: "Guides clients DaCars",
        pageDescription:
            "Guides pratiques pour les clients DaCars afin de réserver, récupérer et utiliser la voiture en toute sérénité.",
        metaTitle: "Guides clients DaCars | Réservation, retrait, assistance",
        metaDescription:
            "Guides pratiques pour les clients DaCars afin de réserver, récupérer et utiliser la voiture en toute sérénité.",
        breadcrumbHome: "Accueil",
        breadcrumbDocs: "Guides clients",
        sectionLabel: "Guides clients",
        notFoundTitle: "Page introuvable | DaCars",
        notFoundDescription: "La page de documentation demandée n'est plus disponible.",
    },
    de: {
        pageTitle: "DaCars Kundenleitfäden",
        pageDescription:
            "Hilfreiche Anleitungen für DaCars Kundinnen und Kunden zum Buchen, Abholen und sicheren Nutzen des Mietwagens.",
        metaTitle: "DaCars Kundenleitfäden | Buchung, Abholung & Support",
        metaDescription:
            "Hilfreiche Anleitungen für DaCars Kundinnen und Kunden zum Buchen, Abholen und sicheren Nutzen des Mietwagens.",
        breadcrumbHome: "Startseite",
        breadcrumbDocs: "Kundenleitfäden",
        sectionLabel: "Kundenleitfäden",
        notFoundTitle: "Seite nicht gefunden | DaCars",
        notFoundDescription: "Die angeforderte Dokumentationsseite ist nicht mehr verfügbar.",
    },
};

export const getDocsSeoCopy = (locale: Locale): DocsSeoCopy => {
    return DOCS_SEO_COPY[locale] ?? DOCS_SEO_COPY[FALLBACK_LOCALE];
};

export const resolveDocsSeo = () => {
    const locale = resolveRequestLocale();
    const copy = getDocsSeoCopy(locale);
    return { locale, copy };
};

export const DOCS_FALLBACK_LOCALE = FALLBACK_LOCALE;
