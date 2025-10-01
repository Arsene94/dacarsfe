import type { Metadata } from "next";
import { cache } from "react";
import HomePageClient from "@/components/home/HomePageClient";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
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

const resolveHomeSeo = cache(async () => {
    const locale = await resolveRequestLocale();
    const copy = HOME_SEO_COPY[locale] ?? HOME_SEO_COPY[FALLBACK_LOCALE];
    return { locale, copy };
});

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = await resolveHomeSeo();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/",
        hreflangLocales: HREFLANG_LOCALES,
        locale,
    });
}

const HomePage = async () => {
    const { copy } = await resolveHomeSeo();
    const structuredData = [
        organization({ description: copy.metaDescription }),
        website({ description: copy.metaDescription }),
        breadcrumb([
            {
                name: copy.breadcrumbHome,
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
