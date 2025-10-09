import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import TermsContent from "./TermsContent";
import { buildMetadata } from "@/lib/seo/meta";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n/config";

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

const TERMS_DIRECTORY = join(process.cwd(), "docs/terms");

const loadTermsHtml = (locale: Locale): string => {
    try {
        return readFileSync(join(TERMS_DIRECTORY, `terms-${locale}.html`), "utf8");
    } catch (error) {
        console.warn(`Nu am putut încărca termenii pentru limba ${locale}`, error);
        return "";
    }
};

const DEFAULT_TERMS_HTML = loadTermsHtml(DEFAULT_LOCALE);

const TERMS_BY_LOCALE: Record<Locale, string> = AVAILABLE_LOCALES.reduce((acc, locale) => {
    if (locale === DEFAULT_LOCALE) {
        acc[locale] = DEFAULT_TERMS_HTML;
        return acc;
    }

    const content = loadTermsHtml(locale);
    acc[locale] = content || DEFAULT_TERMS_HTML;
    return acc;
}, {} as Record<Locale, string>);

const SUPPORTED_LOCALES = new Set<string>(AVAILABLE_LOCALES);

const normalizeLocaleCandidate = (candidate: string | null | undefined): Locale | null => {
    if (!candidate) {
        return null;
    }

    const trimmed = candidate.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }

    if (SUPPORTED_LOCALES.has(trimmed)) {
        return trimmed as Locale;
    }

    const base = trimmed.split(/[-_]/)[0];
    if (SUPPORTED_LOCALES.has(base)) {
        return base as Locale;
    }

    return null;
};

const parseAcceptLanguage = (value: string | null): string[] => {
    if (!value) {
        return [];
    }
    return value
        .split(",")
        .map((part) => part.split(";")[0]?.trim())
        .filter((part): part is string => Boolean(part));
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;

const resolvePreferredLocale = (): Locale => {
    const cookieStore = cookies();
    const cookieLocale = normalizeLocaleCandidate(cookieStore.get(LOCALE_STORAGE_KEY)?.value);
    if (cookieLocale) {
        return cookieLocale;
    }

    const acceptedLocales = parseAcceptLanguage(headers().get("accept-language"));
    for (const candidate of acceptedLocales) {
        const normalized = normalizeLocaleCandidate(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return FALLBACK_LOCALE;
};

export const generateMetadata = (): Metadata => {
    const locale = resolvePreferredLocale();
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
    const locale = resolvePreferredLocale();
    const copy = TERMS_COPY[locale] ?? TERMS_COPY[FALLBACK_LOCALE];

    return (
        <main className="bg-slate-50 py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-center text-3xl md:text-4xl font-poppins font-bold uppercase text-berkeley tracking-wide">
                    {copy.heading}
                </h1>
                <section className="mt-10 rounded-3xl bg-white p-6 sm:p-10 shadow-xl ring-1 ring-berkeley/5">
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
