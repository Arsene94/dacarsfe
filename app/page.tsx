import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import HeroSection from "@/components/HeroSection";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { buildLocalBusinessStructuredData } from "@/lib/seo/localBusiness";
import { buildMetadata } from "@/lib/seo/meta";
import { breadcrumb, organization, website } from "@/lib/seo/jsonld";
import type { Offer } from "@/types/offer";

type HomeSeoCopy = {
    metaTitle: string;
    metaDescription: string;
    breadcrumbHome: string;
};

const HOME_SEO_COPY: Record<Locale, HomeSeoCopy> = {
    ro: {
        metaTitle: `${SITE_NAME} — Închiriere mașină în România din străinătate | Rent a car Otopeni`,
        metaDescription:
            "Închiriază online mașina potrivită în România chiar dacă locuiești în străinătate. Preluare rapidă la Aeroportul Otopeni, contract în limba română și oferte create pentru diaspora DaCars.",
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

const fetchActiveOffers = async (): Promise<Offer[]> => {
    try {
        const response = await apiClient.getOffers({
            audience: "public",
            status: "published",
            limit: 4,
            sort: "-starts_at,-created_at",
        });
        return extractList(response) as Offer[];
    } catch (error) {
        console.error("Nu am putut încărca ofertele pentru schema LocalBusiness", error);
        return [];
    }
};

const LOCAL_BUSINESS_REVIEWS = [
    {
        author: "Mihai Popescu",
        body: "Preluare rapidă la sediu și mașină impecabilă. Personalul a fost foarte prietenos și totul a durat sub 10 minute.",
        rating: 5,
        datePublished: "2024-11-18",
        profileUrl: "https://g.co/kgs/1kLs9uY",
    },
    {
        author: "Ana Ionescu",
        body: "Am avut nevoie de o mașină la miezul nopții și echipa DaCars a răspuns imediat. Recomand pentru disponibilitatea non-stop.",
        rating: 5,
        datePublished: "2024-12-02",
        profileUrl: "https://g.co/kgs/6QSqmuR",
    },
    {
        author: "Radu Stoica",
        body: "Proces clar, tarife corecte și suport rapid pe WhatsApp. O experiență excelentă de închiriere.",
        rating: 4.8,
        datePublished: "2025-01-14",
        profileUrl: "https://g.co/kgs/S8p6n9T",
    },
];

const computeAggregateRating = (ratings: Array<{ rating: number }>) => {
    if (!ratings.length) {
        return null;
    }

    const total = ratings.reduce((sum, item) => sum + item.rating, 0);
    const average = Number((total / ratings.length).toFixed(2));

    return {
        ratingValue: average,
        reviewCount: ratings.length,
        bestRating: 5,
        worstRating: 1,
    } as const;
};

const HomePage = async () => {
    const offers = await fetchActiveOffers();
    const aggregateRating = computeAggregateRating(LOCAL_BUSINESS_REVIEWS);

    const structuredData = [
        organization({ description: FALLBACK_COPY.metaDescription }),
        website({ description: FALLBACK_COPY.metaDescription }),
        breadcrumb([
            {
                name: FALLBACK_COPY.breadcrumbHome,
                url: SITE_URL,
            },
        ]),
        buildLocalBusinessStructuredData(offers, LOCAL_BUSINESS_REVIEWS, aggregateRating ?? undefined),
    ];

    return (
        <>
            <StructuredData data={structuredData} id="home-structured-data" />
            <div className="pt-16 lg:pt-20">
                {/* Rendăm hero-ul ca secțiune server pentru a reduce JS-ul critic */}
                <HeroSection />
            </div>
            <HomePageClient />
        </>
    );
};

export default HomePage;
