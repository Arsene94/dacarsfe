import type { Metadata } from "next";
import FaqPageContent from "@/components/faq/FaqPageContent";
import { createApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/meta";
import type { FaqCategory } from "@/types/faq";
import {
    FALLBACK_LOCALE,
    FAQ_SEO_COPY,
    HREFLANG_LOCALES,
    type FaqSeoCopy,
    type NormalizedFaqCategory,
    normalizeFaqCategories,
} from "@/lib/faq/publicFaq";

const fetchFaqCategories = async (locale: Locale): Promise<NormalizedFaqCategory[]> => {
    try {
        const client = createApiClient();
        client.setLanguage(locale);
        const response = await client.getFaqCategories({
            language: locale,
            include: "faqs",
            status: "published",
            limit: 100,
        });
        const categories = extractList<FaqCategory>(response);
        return normalizeFaqCategories(categories);
    } catch (error) {
        console.error("Nu am putut încărca FAQ-urile", error);
        return [];
    }
};

const resolveFaqSeo = async (): Promise<{ locale: Locale; copy: FaqSeoCopy }> => {
    const locale = await resolveRequestLocale();
    const copy = FAQ_SEO_COPY[locale] ?? FAQ_SEO_COPY[FALLBACK_LOCALE];
    return { locale, copy };
};

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = await resolveFaqSeo();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/faq",
        hreflangLocales: HREFLANG_LOCALES,
        locale,
        openGraphTitle: copy.metaTitle,
        twitterTitle: copy.metaTitle,
    });
}

const FaqPage = async () => {
    const { locale, copy } = await resolveFaqSeo();
    const categories = await fetchFaqCategories(locale);

    return (
        <FaqPageContent
            initialLocale={locale}
            initialCopy={copy}
            initialCategories={categories}
        />
    );
};

export default FaqPage;
