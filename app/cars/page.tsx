import type { Metadata } from "next";
import CarsPageClient from "@/components/cars/CarsPageClient";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { getPageMessages } from "@/lib/i18n/translations";
import { buildMetadata } from "@/lib/seo/meta";
import { breadcrumb, collectionPage, itemList, type ItemListElementInput } from "@/lib/seo/jsonld";
import carsMessagesRo from "@/messages/cars/ro.json";

type CarsMessages = typeof carsMessagesRo;

type CarsSeoCopy = {
    metaTitle: string;
    pageTitle: string;
    description: string;
    keywords: readonly string[];
    breadcrumbHome: string;
    breadcrumbFleet: string;
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

const FALLBACK_COPY: CarsSeoCopy = {
    metaTitle: `Flota completă de mașini pentru închiriere | ${SITE_NAME}`,
    pageTitle: `Flota completă de mașini pentru închiriere | ${SITE_NAME}`,
    description:
        "Explore compact, SUV, and premium rentals with transparent pricing and instant pick-up from DaCars.",
    keywords: [
        "car rental fleet",
        "DaCars",
        "rent a car",
    ],
    breadcrumbHome: "Home",
    breadcrumbFleet: "Car fleet",
};

const resolveCarsSeo = () => {
    const locale = resolveRequestLocale();
    const messages = getPageMessages<CarsMessages>("cars", locale);
    const metadataMessages = messages.metadata ?? getPageMessages<CarsMessages>("cars", FALLBACK_LOCALE).metadata;

    const copy: CarsSeoCopy = {
        metaTitle: metadataMessages?.openGraphTitle ?? metadataMessages?.title ?? FALLBACK_COPY.metaTitle,
        pageTitle: metadataMessages?.title ?? FALLBACK_COPY.pageTitle,
        description: metadataMessages?.description ?? FALLBACK_COPY.description,
        keywords: metadataMessages?.keywords ?? FALLBACK_COPY.keywords,
        breadcrumbHome: metadataMessages?.breadcrumb?.home ?? FALLBACK_COPY.breadcrumbHome,
        breadcrumbFleet: metadataMessages?.breadcrumb?.fleet ?? FALLBACK_COPY.breadcrumbFleet,
    };

    return { locale, copy };
};

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = resolveCarsSeo();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.description,
        path: "/cars",
        hreflangLocales: HREFLANG_LOCALES,
        keywords: copy.keywords,
        locale,
        openGraphTitle: copy.metaTitle,
        twitterTitle: copy.metaTitle,
    });
}

const CAR_ITEMS: ItemListElementInput[] = [
    {
        name: "Compact City",
        url: `${SITE_URL}/cars#compact-city`,
        image: `${SITE_URL}/images/cars/compact-city.jpg`,
        brand: "Example Motors",
        description: "Agile automatic hatchback ideal for urban escapes.",
    },
    {
        name: "SUV Explorer",
        url: `${SITE_URL}/cars#suv-explorer`,
        image: `${SITE_URL}/images/cars/suv-explorer.jpg`,
        brand: "Example Motors",
        description: "Spacious SUV with all-wheel drive for weekend adventures.",
    },
    {
        name: "Executive Sedan",
        url: `${SITE_URL}/cars#executive-sedan`,
        image: `${SITE_URL}/images/cars/executive-sedan.jpg`,
        brand: "Example Motors",
        description: "Premium sedan featuring leather interior and adaptive cruise.",
    },
];
// TODO: Înlocuiește lista de mai sus cu datele reale din flota publică atunci când devin disponibile.

const CarsPage = () => {
    const { copy } = resolveCarsSeo();

    const structuredData = [
        collectionPage({
            name: copy.pageTitle,
            url: `${SITE_URL}/cars`,
            description: copy.description,
            items: itemList(CAR_ITEMS),
        }),
        breadcrumb([
            { name: copy.breadcrumbHome, url: SITE_URL },
            { name: copy.breadcrumbFleet, url: `${SITE_URL}/cars` },
        ]),
    ];

    return (
        <>
            <StructuredData data={structuredData} id="cars-structured-data" />
            <CarsPageClient />
        </>
    );
};

export default CarsPage;
