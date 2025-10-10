import type { Metadata } from "next";

import TermsContent from "./TermsContent";
import TermsContentStyles from "./TermsContentStyles";
import termsDe from "@/docs/terms/terms-de.html?raw";
import termsEn from "@/docs/terms/terms-en.html?raw";
import termsEs from "@/docs/terms/terms-es.html?raw";
import termsFr from "@/docs/terms/terms-fr.html?raw";
import termsIt from "@/docs/terms/terms-it.html?raw";
import termsRo from "@/docs/terms/terms-ro.html?raw";
import { createLegalHtmlByLocale } from "@/lib/content/legal";
import { buildMetadata } from "@/lib/seo/meta";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale, getFallbackLocale } from "@/lib/i18n/serverLocale";

type TermsCopy = {
    heading: string;
    metaTitle: string;
    metaDescription: string;
};

const TERMS_COPY: Record<Locale, TermsCopy> = {
    ro: {
        heading: "Condiții generale contractuale pentru închiriere autovehicule",
        metaTitle: "Termeni și Condiții închiriere auto | DaCars",
        metaDescription:
            "Condiții generale contractuale pentru închirierea autovehiculelor DaCars: obligații, garanții, asigurări și modalități de plată.",
    },
    en: {
        heading: "General contractual terms for vehicle rentals",
        metaTitle: "Car Rental Terms and Conditions | DaCars",
        metaDescription:
            "Discover DaCars' rental policies: obligations for drivers, guarantees, insurance coverage and accepted payment methods.",
    },
    it: {
        heading: "Condizioni generali contrattuali per il noleggio dei veicoli",
        metaTitle: "Termini e condizioni di noleggio auto | DaCars",
        metaDescription:
            "Consulta le condizioni di noleggio DaCars: obblighi per il conducente, garanzia, coperture assicurative e modalità di pagamento.",
    },
    es: {
        heading: "Condiciones contractuales generales para el alquiler de vehículos",
        metaTitle: "Términos y condiciones de alquiler de coches | DaCars",
        metaDescription:
            "Revisa las políticas de alquiler de DaCars: obligaciones del conductor, garantía, coberturas de seguro y formas de pago aceptadas.",
    },
    fr: {
        heading: "Conditions générales contractuelles pour la location de véhicules",
        metaTitle: "Conditions de location de voitures | DaCars",
        metaDescription:
            "Consultez les conditions de location DaCars : obligations des conducteurs, garanties, couvertures d'assurance et moyens de paiement acceptés.",
    },
    de: {
        heading: "Allgemeine Vertragsbedingungen für die Fahrzeugvermietung",
        metaTitle: "Mietbedingungen für Autos | DaCars",
        metaDescription:
            "Erfahren Sie mehr über die Mietbedingungen von DaCars: Pflichten der Fahrer, Kaution, Versicherungsschutz und akzeptierte Zahlungsmethoden.",
    },
};

const TERMS_HTML = {
    de: termsDe,
    en: termsEn,
    es: termsEs,
    fr: termsFr,
    it: termsIt,
    ro: termsRo,
} as const satisfies Partial<Record<Locale, string>>;

const TERMS_BY_LOCALE: Record<Locale, string> = createLegalHtmlByLocale(TERMS_HTML, {
    defaultLocale: DEFAULT_LOCALE,
});

const FALLBACK_LOCALE: Locale = getFallbackLocale();

export const generateMetadata = (): Metadata => {
    const locale = resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
    const copy = TERMS_COPY[locale] ?? TERMS_COPY[FALLBACK_LOCALE];

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/termeni-si-conditii",
        locale,
        hreflangLocales: AVAILABLE_LOCALES,
    });
};

const TermsAndConditionsPage = () => {
    const locale = resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
    const copy = TERMS_COPY[locale] ?? TERMS_COPY[FALLBACK_LOCALE];

    return (
        <main className="bg-slate-50 py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-center text-3xl md:text-4xl font-poppins font-bold uppercase text-berkeley tracking-wide">
                    {copy.heading}
                </h1>
                <section className="mt-10 rounded-3xl bg-white p-6 sm:p-10 shadow-xl ring-1 ring-berkeley/5">
                    <TermsContentStyles />
                    <TermsContent
                        initialLocale={locale}
                        htmlByLocale={TERMS_BY_LOCALE}
                        fallbackLocale={FALLBACK_LOCALE}
                    />
                </section>
            </div>
        </main>
    );
};

export default TermsAndConditionsPage;
