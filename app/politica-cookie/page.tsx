import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";

import TermsContent from "@/app/termeni-si-conditii/TermsContent";
import { buildMetadata } from "@/lib/seo/meta";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale, getFallbackLocale } from "@/lib/i18n/serverLocale";

const COOKIE_COPY: Record<Locale, { heading: string; metaTitle: string; metaDescription: string }> = {
    ro: {
        heading: "Politica de cookies",
        metaTitle: "Politica de cookies DaCars",
        metaDescription:
            "Află ce cookie-uri folosim pe dacars.ro, ce date colectează și cum îți poți gestiona preferințele de tracking.",
    },
    en: {
        heading: "Cookie policy",
        metaTitle: "DaCars Cookie Policy",
        metaDescription:
            "Learn which cookies are active on dacars.ro, the data they collect and how you can manage your tracking preferences.",
    },
    it: {
        heading: "Politica sui cookie",
        metaTitle: "Politica sui cookie DaCars",
        metaDescription:
            "Scopri quali cookie utilizziamo su dacars.ro, quali dati raccolgono e come puoi gestire le preferenze di tracciamento.",
    },
    es: {
        heading: "Política de cookies",
        metaTitle: "Política de cookies de DaCars",
        metaDescription:
            "Consulta los tipos de cookies activos en dacars.ro, la información que recopilan y cómo gestionar tus preferencias.",
    },
    fr: {
        heading: "Politique en matière de cookies",
        metaTitle: "Politique de cookies DaCars",
        metaDescription:
            "Découvrez les cookies utilisés sur dacars.ro, les données collectées et la manière de gérer vos préférences de suivi.",
    },
    de: {
        heading: "Cookie-Richtlinie",
        metaTitle: "DaCars Cookie-Richtlinie",
        metaDescription:
            "Erfahren Sie, welche Cookies auf dacars.ro aktiv sind, welche Daten sie erfassen und wie Sie Ihre Präferenzen steuern.",
    },
};

const COOKIES_DIRECTORY = join(process.cwd(), "docs/cookies");

const loadCookieHtml = (locale: Locale): string => {
    try {
        return readFileSync(join(COOKIES_DIRECTORY, `policy-${locale}.html`), "utf8");
    } catch (error) {
        console.warn(`Nu am putut încărca politica de cookies pentru limba ${locale}`, error);
        return "";
    }
};

const DEFAULT_COOKIE_HTML = loadCookieHtml(DEFAULT_LOCALE);

const COOKIES_BY_LOCALE: Record<Locale, string> = AVAILABLE_LOCALES.reduce((acc, locale) => {
    if (locale === DEFAULT_LOCALE) {
        acc[locale] = DEFAULT_COOKIE_HTML;
        return acc;
    }

    const content = loadCookieHtml(locale);
    acc[locale] = content || DEFAULT_COOKIE_HTML;
    return acc;
}, {} as Record<Locale, string>);

const FALLBACK_LOCALE: Locale = getFallbackLocale();

export const generateMetadata = (): Metadata => {
    const locale = resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
    const copy = COOKIE_COPY[locale] ?? COOKIE_COPY[FALLBACK_LOCALE];

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: "/politica-cookie",
        locale,
        hreflangLocales: AVAILABLE_LOCALES,
    });
};

const CookiePolicyPage = () => {
    const locale = resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
    const copy = COOKIE_COPY[locale] ?? COOKIE_COPY[FALLBACK_LOCALE];

    return (
        <main className="bg-slate-50 py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-center text-3xl md:text-4xl font-poppins font-bold uppercase text-berkeley tracking-wide">
                    {copy.heading}
                </h1>
                <section className="mt-10 rounded-3xl bg-white p-6 sm:p-10 shadow-xl ring-1 ring-berkeley/5">
                    <TermsContent
                        initialLocale={locale}
                        htmlByLocale={COOKIES_BY_LOCALE}
                        fallbackLocale={FALLBACK_LOCALE}
                    />
                </section>
            </div>
        </main>
    );
};

export default CookiePolicyPage;
