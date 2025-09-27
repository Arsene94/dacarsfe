import type { Metadata } from "next";
import CarsPageClient from "@/components/cars/CarsPageClient";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { buildMetadata } from "@/lib/seo/meta";
import { breadcrumb, collectionPage, itemList, type ItemListElementInput } from "@/lib/seo/jsonld";
import carsMessagesRo from "@/messages/cars/ro.json";

type CarsMessages = typeof carsMessagesRo;

const PAGE_TITLE = `Browse Cars | ${SITE_NAME}`;
const PAGE_DESCRIPTION =
    "Explore compact, SUV, and premium rentals with transparent pricing and instant pick-up from DaCars.";

const carsMessages: CarsMessages = carsMessagesRo;
const { metadata: carsMetadataMessages } = carsMessages;

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        path: "/cars",
        hreflangLocales: ["en", "ro"],
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

const structuredData = [
    collectionPage({
        name: `${SITE_NAME} Fleet`,
        url: `${SITE_URL}/cars`,
        description: PAGE_DESCRIPTION,
        items: itemList(CAR_ITEMS),
    }),
    breadcrumb([
        { name: carsMetadataMessages?.breadcrumb?.home ?? "Home", url: SITE_URL },
        { name: carsMetadataMessages?.breadcrumb?.fleet ?? "Cars", url: `${SITE_URL}/cars` },
    ]),
];

const CarsPage = () => (
    <>
        <StructuredData data={structuredData} id="cars-structured-data" />
        <CarsPageClient />
    </>
);

export default CarsPage;
