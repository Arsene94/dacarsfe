import type { Metadata } from "next";
import CarsPageClient from "@/components/cars/CarsPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import {
    createBreadcrumbStructuredData,
    createSearchActionStructuredData,
} from "@/lib/seo/structuredData";
import carsMessagesRo from "@/messages/cars/ro.json";

type CarsMessages = typeof carsMessagesRo;

const siteUrl = siteMetadata.siteUrl;
const pageUrl = absoluteUrl("/cars");

const carsMessages: CarsMessages = carsMessagesRo;
const { metadata: carsMetadataMessages } = carsMessages;

const carsMetadata = buildMetadata({
    title: carsMetadataMessages.title,
    description: carsMetadataMessages.description,
    keywords: carsMetadataMessages.keywords,
    path: "/cars",
    openGraphTitle: carsMetadataMessages.openGraphTitle,
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

const breadcrumbMessages = carsMetadataMessages.breadcrumb ?? { home: "Acasă", fleet: "Flotă auto" };

const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: breadcrumbMessages.home ?? "Acasă", item: siteUrl },
    { name: breadcrumbMessages.fleet ?? "Flotă auto", item: pageUrl },
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
