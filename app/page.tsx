import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import StructuredData from "@/components/StructuredData";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { buildMetadata } from "@/lib/seo/meta";
import { breadcrumb, organization, website } from "@/lib/seo/jsonld";

const HOME_TITLE = `${SITE_NAME} — Seamless Car Rentals & Offers`;
const HOME_DESCRIPTION =
    "Discover flexible car rentals, curated offers, and fast support for every journey with Example Rentals.";

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: HOME_TITLE,
        description: HOME_DESCRIPTION,
        path: "/",
        hreflangLocales: ["en", "ro"],
    });
}

const structuredData = [
    organization(),
    website(),
    breadcrumb([
        {
            name: "Home",
            url: SITE_URL,
        },
    ]),
];

const HomePage = () => {
    return (
        <>
            <StructuredData data={structuredData} id="home-structured-data" />
            <HomePageClient />
        </>
    );
};

export default HomePage;
