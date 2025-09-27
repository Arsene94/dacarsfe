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
        pageTitle: "Documentație DaCars",
        pageDescription:
            "Proceduri pas-cu-pas pentru configurarea flotei, tarifelor și raportării în platforma DaCars.",
        metaTitle: "Documentație DaCars | Ghiduri și proceduri",
        metaDescription:
            "Proceduri pas-cu-pas pentru configurarea flotei, tarifelor și raportării în platforma DaCars.",
        breadcrumbHome: "Acasă",
        breadcrumbDocs: "Documentație",
        sectionLabel: "Documentație",
        notFoundTitle: "Pagina nu a fost găsită | DaCars",
        notFoundDescription: "Documentația solicitată nu există sau a fost mutată.",
    },
    en: {
        pageTitle: "DaCars Documentation",
        pageDescription:
            "Step-by-step procedures for fleet configuration, pricing rules, and reporting across the DaCars platform.",
        metaTitle: "DaCars Docs | Configuration Guides & Processes",
        metaDescription:
            "Step-by-step procedures for fleet configuration, pricing rules, and reporting across the DaCars platform.",
        breadcrumbHome: "Home",
        breadcrumbDocs: "Documentation",
        sectionLabel: "Documentation",
        notFoundTitle: "Page not found | DaCars",
        notFoundDescription: "The requested documentation page is no longer available.",
    },
    it: {
        pageTitle: "Documentazione DaCars",
        pageDescription:
            "Procedure passo-passo per configurare la flotta, le tariffe e i report nella piattaforma DaCars.",
        metaTitle: "Documentazione DaCars | Guide e procedure",
        metaDescription:
            "Procedure passo-passo per configurare la flotta, le tariffe e i report nella piattaforma DaCars.",
        breadcrumbHome: "Pagina iniziale",
        breadcrumbDocs: "Documentazione",
        sectionLabel: "Documentazione",
        notFoundTitle: "Pagina non trovata | DaCars",
        notFoundDescription: "La pagina di documentazione richiesta non è più disponibile.",
    },
    es: {
        pageTitle: "Documentación DaCars",
        pageDescription:
            "Procedimientos paso a paso para configurar la flota, las tarifas y los informes en la plataforma DaCars.",
        metaTitle: "Documentación DaCars | Guías y procesos",
        metaDescription:
            "Procedimientos paso a paso para configurar la flota, las tarifas y los informes en la plataforma DaCars.",
        breadcrumbHome: "Inicio",
        breadcrumbDocs: "Documentación",
        sectionLabel: "Documentación",
        notFoundTitle: "Página no encontrada | DaCars",
        notFoundDescription: "La página de documentación solicitada ya no está disponible.",
    },
    fr: {
        pageTitle: "Documentation DaCars",
        pageDescription:
            "Procédures pas à pas pour configurer la flotte, les tarifs et les rapports dans la plateforme DaCars.",
        metaTitle: "Documentation DaCars | Guides et procédures",
        metaDescription:
            "Procédures pas à pas pour configurer la flotte, les tarifs et les rapports dans la plateforme DaCars.",
        breadcrumbHome: "Accueil",
        breadcrumbDocs: "Documentation",
        sectionLabel: "Documentation",
        notFoundTitle: "Page introuvable | DaCars",
        notFoundDescription: "La page de documentation demandée n'est plus disponible.",
    },
    de: {
        pageTitle: "DaCars Dokumentation",
        pageDescription:
            "Schritt-für-Schritt-Anleitungen zur Flottenkonfiguration, Preisgestaltung und Berichterstattung in der DaCars-Plattform.",
        metaTitle: "DaCars Dokumentation | Leitfäden und Prozesse",
        metaDescription:
            "Schritt-für-Schritt-Anleitungen zur Flottenkonfiguration, Preisgestaltung und Berichterstattung in der DaCars-Plattform.",
        breadcrumbHome: "Startseite",
        breadcrumbDocs: "Dokumentation",
        sectionLabel: "Dokumentation",
        notFoundTitle: "Seite nicht gefunden | DaCars",
        notFoundDescription: "Die angeforderte Dokumentationsseite ist nicht mehr verfügbar.",
    },
};

export const getDocsSeoCopy = (locale: Locale): DocsSeoCopy => {
    return DOCS_SEO_COPY[locale] ?? DOCS_SEO_COPY[FALLBACK_LOCALE];
};

export const resolveDocsSeo = async () => {
    const locale = await resolveRequestLocale();
    const copy = getDocsSeoCopy(locale);
    return { locale, copy };
};

export const DOCS_FALLBACK_LOCALE = FALLBACK_LOCALE;
