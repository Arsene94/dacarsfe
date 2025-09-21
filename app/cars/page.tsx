import type { Metadata } from "next";
import CarsPageClient from "@/components/cars/CarsPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import {
    createBreadcrumbStructuredData,
    createSearchActionStructuredData,
} from "@/lib/seo/structuredData";

const siteUrl = siteMetadata.siteUrl;
const pageUrl = absoluteUrl("/cars");

const PAGE_DESCRIPTION =
    "Analizează toată flota DaCars și filtrează rapid mașinile disponibile pentru închiriere.";

const carsMetadata = buildMetadata({
    title: "Flota completă de mașini pentru închiriere",
    description: PAGE_DESCRIPTION,
    keywords: [
        "flotă închirieri auto",
        "mașini disponibile București",
        "rent a car fără garanție",
        "rezervare mașină online",
        "DaCars flotă auto",
    ],
    path: "/cars",
    openGraphTitle: "Flota completă de mașini pentru închiriere | DaCars Rent a Car",
});

export const metadata: Metadata = {
    ...carsMetadata,
};

const searchStructuredData = createSearchActionStructuredData({
    siteUrl,
    siteName: siteMetadata.siteName,
    target: `${pageUrl}?search={search_term_string}`,
    queryInput: "required name=search_term_string",
});

const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Acasă", item: siteUrl },
    { name: "Flotă auto", item: pageUrl },
]);

const CarsPage = () => (
    <>
        <JsonLd data={searchStructuredData} id="dacars-cars-search" />
        {breadcrumbStructuredData && (
            <JsonLd data={breadcrumbStructuredData} id="dacars-cars-breadcrumb" />
        )}
        <CarsPageClient />
    </>
);

export default CarsPage;
