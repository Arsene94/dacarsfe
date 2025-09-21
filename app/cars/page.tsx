import type { Metadata } from "next";
import CarsPageClient from "@/components/cars/CarsPageClient";
import JsonLd from "@/components/seo/JsonLd";
import {
    createBreadcrumbStructuredData,
    createSearchActionStructuredData,
    resolveSiteUrl,
} from "@/lib/seo/structuredData";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = resolveSiteUrl(rawSiteUrl);
const pageUrl = `${siteUrl}/cars`;

const PAGE_DESCRIPTION =
    "Analizează toată flota DaCars și filtrează rapid mașinile disponibile pentru închiriere.";

export const metadata: Metadata = {
    title: "Flota completă de mașini pentru închiriere | DaCars Rent a Car",
    description: PAGE_DESCRIPTION,
    alternates: {
        canonical: pageUrl,
    },
    openGraph: {
        type: "website",
        url: pageUrl,
        title: "Flota completă de mașini pentru închiriere | DaCars",
        description: PAGE_DESCRIPTION,
        images: [
            {
                url: `${siteUrl}/images/logo-308x154.webp`,
                width: 308,
                height: 154,
                alt: "DaCars Rent a Car",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Flota DaCars de închirieri auto",
        description: PAGE_DESCRIPTION,
        images: [`${siteUrl}/images/logo-308x154.webp`],
    },
    keywords: [
        "flotă închirieri auto",
        "mașini disponibile București",
        "rent a car fără garanție",
        "rezervare mașină online",
        "DaCars flotă auto",
    ],
};

const searchStructuredData = createSearchActionStructuredData({
    siteUrl,
    siteName: "DaCars Rent a Car",
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
