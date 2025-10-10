import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";

import TermsContent from "@/app/termeni-si-conditii/TermsContent";
import TermsContentStyles from "@/app/termeni-si-conditii/TermsContentStyles";
import { buildMetadata } from "@/lib/seo/meta";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale, getFallbackLocale } from "@/lib/i18n/serverLocale";

type PrivacyCopy = {
    heading: string;
    metaTitle: string;
    metaDescription: string;
};

const PRIVACY_COPY: Record<Locale, PrivacyCopy> = {
    ro: {
        heading: "Politica de confidențialitate și protecția datelor personale",
        metaTitle: "Politica de confidențialitate DaCars | Protecția datelor",
        metaDescription:
            "Află cum colectează, procesează și protejează DaCars datele personale ale clienților și reprezentanților companiilor.",
    },
    en: {
        heading: "Privacy policy and personal data protection",
        metaTitle: "DaCars Privacy Policy | Data protection details",
        metaDescription:
            "Understand how DaCars collects, processes and protects customers’ and corporate representatives’ personal data.",
    },
    it: {
        heading: "Informativa sulla privacy e protezione dei dati personali",
        metaTitle: "Informativa privacy DaCars | Tutela dei dati",
        metaDescription:
            "Scopri come DaCars raccoglie, tratta e protegge i dati personali dei clienti e dei rappresentanti aziendali.",
    },
    es: {
        heading: "Política de privacidad y protección de datos personales",
        metaTitle: "Política de privacidad DaCars | Protección de datos",
        metaDescription:
            "Descubre cómo DaCars recopila, procesa y protege los datos personales de clientes y representantes corporativos.",
    },
    fr: {
        heading: "Politique de confidentialité et protection des données personnelles",
        metaTitle: "Politique de confidentialité DaCars | Protection des données",
        metaDescription:
            "Découvrez comment DaCars collecte, traite et protège les données personnelles des clients et des représentants d’entreprises.",
    },
    de: {
        heading: "Datenschutzerklärung und Schutz personenbezogener Daten",
        metaTitle: "DaCars Datenschutz | Informationen zum Umgang mit Daten",
        metaDescription:
            "Erfahren Sie, wie DaCars personenbezogene Daten von Kunden und Unternehmensvertretern erhebt, verarbeitet und schützt.",
    },
};

const PRIVACY_DIRECTORY = join(process.cwd(), "docs/privacy");

const loadPrivacyHtml = (locale: Locale): string => {
    try {
        return readFileSync(join(PRIVACY_DIRECTORY, `policy-${locale}.html`), "utf8");
    } catch (error) {
        console.warn(`Nu am putut încărca politica de confidențialitate pentru limba ${locale}`, error);
        return "";
    }
};

const DEFAULT_PRIVACY_HTML = loadPrivacyHtml(DEFAULT_LOCALE);

const PRIVACY_BY_LOCALE: Record<Locale, string> = AVAILABLE_LOCALES.reduce((acc, locale) => {
    if (locale === DEFAULT_LOCALE) {
        acc[locale] = DEFAULT_PRIVACY_HTML;
        return acc;
    }

    const content = loadPrivacyHtml(locale);
    acc[locale] = content || DEFAULT_PRIVACY_HTML;
    return acc;
}, {} as Record<Locale, string>);

const FALLBACK_LOCALE: Locale = getFallbackLocale();

export const generateMetadata = (): Metadata => {
    const locale = resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
    const copy = PRIVACY_COPY[locale] ?? PRIVACY_COPY[FALLBACK_LOCALE];

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/politica-de-confidentialitate",
        locale,
        hreflangLocales: AVAILABLE_LOCALES,
    });
};

const PrivacyPolicyPage = () => {
    const locale = resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
    const copy = PRIVACY_COPY[locale] ?? PRIVACY_COPY[FALLBACK_LOCALE];

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
                        htmlByLocale={PRIVACY_BY_LOCALE}
                        fallbackLocale={FALLBACK_LOCALE}
                    />
                </section>
            </div>
        </main>
    );
};

export default PrivacyPolicyPage;
