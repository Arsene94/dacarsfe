import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { buildMetadata } from "@/lib/seo/meta";
import { breadcrumb, organization, website } from "@/lib/seo/jsonld";

type HomeSeoCopy = {
    metaTitle: string;
    metaDescription: string;
    breadcrumbHome: string;
};

const HOME_SEO_COPY: Record<Locale, HomeSeoCopy> = {
    ro: {
        metaTitle: `${SITE_NAME} — Închirieri auto fără stres & oferte personalizate`,
        metaDescription:
            "Descoperă închirieri auto flexibile, oferte verificate și suport rapid pentru fiecare călătorie DaCars.",
        breadcrumbHome: "Acasă",
    },
    en: {
        metaTitle: `${SITE_NAME} — Seamless Car Rentals & Offers`,
        metaDescription:
            "Discover flexible car rentals, curated deals, and responsive support for every DaCars journey.",
        breadcrumbHome: "Home",
    },
    it: {
        metaTitle: `${SITE_NAME} — Noleggi auto senza stress & offerte dedicate`,
        metaDescription:
            "Scopri noleggi auto flessibili, promozioni selezionate e assistenza rapida per ogni viaggio DaCars.",
        breadcrumbHome: "Pagina iniziale",
    },
    es: {
        metaTitle: `${SITE_NAME} — Alquiler de coches sin complicaciones & ofertas especiales`,
        metaDescription:
            "Descubre alquileres de coche flexibles, ofertas seleccionadas y soporte ágil para cada viaje con DaCars.",
        breadcrumbHome: "Inicio",
    },
    fr: {
        metaTitle: `${SITE_NAME} — Location de voitures fluide & offres avantageuses`,
        metaDescription:
            "Découvrez des locations de voiture flexibles, des offres sélectionnées et une assistance rapide pour chaque trajet DaCars.",
        breadcrumbHome: "Accueil",
    },
    de: {
        metaTitle: `${SITE_NAME} — Autovermietung ohne Stress & exklusive Angebote`,
        metaDescription:
            "Erlebe flexible Mietwagen, kuratierte Angebote und schnellen Support für jede DaCars-Reise.",
        breadcrumbHome: "Startseite",
    },
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

export const dynamic = "force-static";

const FALLBACK_COPY = HOME_SEO_COPY[FALLBACK_LOCALE];

export const metadata: Metadata = buildMetadata({
    title: FALLBACK_COPY.metaTitle,
    description: FALLBACK_COPY.metaDescription,
    path: "/",
    hreflangLocales: HREFLANG_LOCALES,
    locale: FALLBACK_LOCALE,
});

const HomePage = () => {
    const structuredData = [
        organization({ description: FALLBACK_COPY.metaDescription }),
        website({ description: FALLBACK_COPY.metaDescription }),
        breadcrumb([
            {
                name: FALLBACK_COPY.breadcrumbHome,
                url: SITE_URL,
            },
        ]),
    ];

    return (
        <>
            <StructuredData data={structuredData} id="home-structured-data" />
            <HomePageClient />
        </>
    );
};

export default HomePage;
