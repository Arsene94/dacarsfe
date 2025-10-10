import Link from "next/link";
import type { Metadata } from "next";

import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { ApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { ORG_LOGO_URL, ORG_SAME_AS, SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/meta";
import {
    breadcrumb,
    buildFaqJsonLd,
    type FaqEntry as FaqEntryJson,
    type OfferInput,
    offer,
    type JsonLd,
} from "@/lib/seo/jsonld";
import type { Offer } from "@/types/offer";

const CTA_PRIMARY_HREF = "https://dacars.ro/otopeni-rent-a-car-rapid";
const CTA_PHONE_NUMBER = "+40 741 234 567";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const OFFER_AVAILABILITY = "https://schema.org/InStock" as const;
const CTA_PHONE_NUMBER_E164 = CTA_PHONE_NUMBER.replace(/\s+/g, "");

const BUSINESS_ADDRESS = {
    "@type": "PostalAddress",
    streetAddress: "Calea Bucureștilor 305",
    addressLocality: "Otopeni",
    addressRegion: "IF",
    postalCode: "075100",
    addressCountry: "RO",
} as const;

const BUSINESS_GEO = {
    "@type": "GeoCoordinates",
    latitude: 44.5719,
    longitude: 26.0798,
} as const;

const OPENING_HOURS = [
    {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ],
        opens: "00:00",
        closes: "23:59",
    },
] as const;

const LOCAL_REVIEWS: JsonLd[] = [
    {
        "@type": "Review",
        name: "Predare impecabilă la Sosiri",
        reviewBody:
            "Am aterizat la 22:40 și consultantul DaCars era deja la cafeneaua Take Off cu contractul pregătit. În patru minute aveam cheia, mașina încălzită și traseul spre DN1 în Google Maps. E prima dată când predarea chiar durează cât promit.",
        author: {
            "@type": "Person",
            name: "Andrei M.",
        },
        datePublished: "2024-04-18",
        reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
        },
    },
    {
        "@type": "Review",
        name: "Rapid și transparent",
        reviewBody:
            "Am primit SMS cu poza consultantului și voucherul actualizat imediat după îmbarcare. La Otopeni am semnat digital, au verificat permisul prin NFC și am plecat cu un Clio nou în trei minute. Mi-au explicat clar garanția și returul 24/7.",
        author: {
            "@type": "Person",
            name: "Ioana M.",
        },
        datePublished: "2024-02-27",
        reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
        },
    },
    {
        "@type": "Review",
        name: "Suport excelent la zbor întârziat",
        reviewBody:
            "Zborul din Madrid a aterizat cu o oră întârziere, dar echipa DaCars m-a ținut la curent pe WhatsApp. Consultantul a reposiționat mașina și a pregătit scaunul pentru copil înainte să ajungem în parcare. Proces impecabil și foarte prietenos.",
        author: {
            "@type": "Person",
            name: "Raluca M.",
        },
        datePublished: "2023-11-09",
        reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
        },
    },
];

const FALLBACK_OFFER_INPUTS: OfferInput[] = [
    {
        name: "Reducere nuntă 10%",
        description:
            "Prezinți invitația de nuntă la predarea din Otopeni și primești 10% reducere imediată pe contract.",
        priceCurrency: "EUR",
        price: "0",
        url: `${SITE_URL}/offers#reducere-nunta`,
        availability: OFFER_AVAILABILITY,
    },
    {
        name: "Adu un prieten: +20% cumulată",
        description:
            "Rezervările simultane pentru tine și un prieten aduc o reducere cumulată de 20% aplicată la ridicare.",
        priceCurrency: "EUR",
        price: "0",
        url: `${SITE_URL}/offers#adu-un-prieten`,
        availability: OFFER_AVAILABILITY,
    },
];

const FALLBACK_OFFER_JSONLD = FALLBACK_OFFER_INPUTS.map((entry) => offer(entry));

const extractOfferPrice = (raw: string | null | undefined): string => {
    if (!raw) {
        return "0";
    }

    const match = raw.match(/[0-9]+(?:[.,][0-9]+)?/);
    if (!match) {
        return "0";
    }

    return match[0].replace(",", ".");
};

const toAbsoluteOfferUrl = (href?: string | null, slug?: string | null): string => {
    if (href) {
        try {
            return new URL(href, SITE_URL).toString();
        } catch {
            /* noop */
        }
    }

    if (slug) {
        return `${SITE_URL}/offers/${slug}`;
    }

    return `${SITE_URL}/offers`;
};

const mapOfferToInput = (entry: Offer): OfferInput | null => {
    const name = entry.title?.trim();
    if (!name) {
        return null;
    }

    return {
        name,
        description: entry.description ?? undefined,
        priceCurrency: "EUR",
        price: extractOfferPrice(entry.offer_value ?? entry.discount_label ?? null),
        url: toAbsoluteOfferUrl(entry.primary_cta_url, entry.slug ?? null),
        validFrom: entry.starts_at ?? undefined,
        validThrough: entry.ends_at ?? undefined,
        availability: OFFER_AVAILABILITY,
    };
};

const fetchOfferStructuredData = async (): Promise<JsonLd[]> => {
    try {
        const api = new ApiClient(API_BASE_URL);
        const response = await api.getOffers({
            audience: "public",
            status: "published",
            limit: 5,
            sort: "-starts_at,-created_at",
        });
        const offers = extractList(response) as Offer[];
        const inputs = offers
            .map((entry) => mapOfferToInput(entry))
            .filter((entry): entry is OfferInput => entry !== null)
            .slice(0, 3);

        if (inputs.length === 0) {
            return [];
        }

        return inputs.map((entry) => offer(entry));
    } catch (error) {
        console.error("Nu s-au putut încărca ofertele pentru schema LocalBusiness", error);
        return [];
    }
};

const buildLocalBusinessJsonLd = async (): Promise<JsonLd> => {
    const offers = await fetchOfferStructuredData();

    return {
        "@context": "https://schema.org",
        "@type": "CarRental",
        "@id": `${PAGE_URL}#car-rental`,
        name: `${SITE_NAME} Otopeni – predare rapidă`,
        description:
            "Predare rent a car în sub cinci minute la terminalul Sosiri Otopeni, cu contract digital și suport 24/7 DaCars.",
        image: ORG_LOGO_URL,
        url: PAGE_URL,
        telephone: CTA_PHONE_NUMBER_E164,
        sameAs: [...ORG_SAME_AS],
        priceRange: "€€",
        areaServed: [
            "Otopeni",
            "Aeroportul Henri Coandă",
            "București",
            "Ilfov",
            "România",
        ],
        knowsAbout: [
            "Închirieri auto Otopeni",
            "Predare rapidă rent a car",
            "Protecție totală DaCars",
        ],
        hasMap: "https://maps.google.com/?q=Calea+Bucurestilor+305+Otopeni",
        address: BUSINESS_ADDRESS,
        geo: BUSINESS_GEO,
        openingHoursSpecification: OPENING_HOURS,
        makesOffer: offers.length > 0 ? offers : FALLBACK_OFFER_JSONLD,
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: 124,
            bestRating: "5",
            worstRating: "1",
        },
        review: LOCAL_REVIEWS,
        contactPoint: [
            {
                "@type": "ContactPoint",
                telephone: CTA_PHONE_NUMBER_E164,
                contactType: "customer service",
                availableLanguage: ["ro", "en", "es", "it"],
            },
        ],
        paymentAccepted: ["Card de credit", "Card de debit", "Transfer bancar"],
        serviceType: "Predare rapidă DaCars Otopeni",
    };
};

const PAGE_PATH = "/otopeni-rent-a-car-rapid";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}` as const;
const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro"] as const;

const INTRO_PARAGRAPH =
    "DaCars Otopeni te așteaptă direct la terminalul Sosiri, pe Calea Bucureștilor 224E, cu echipa pregătită să finalizeze contractul înainte să cobori din avion. Programul fizic este 06:00–23:30, iar pentru zboruri deviate păstrăm gardă telefonică la +40 741 234 567. Monitorizăm numărul de zbor și pregătim cheia, contractul digital și garanția înainte de aterizare. Consultantul te întâmpină lângă cafeneaua „Take Off”, îți prezintă rapid opțiunile de protecție și îți setează navigația spre DN1. În mai puțin de cinci minute pleci relaxat spre București, cu suport local la un mesaj distanță.";

const QUOTE_BULLETS = [
    "Predarea se desfășoară chiar în terminalul Sosiri, lângă cafeneaua „Take Off”, într-un colț delimitat cu semnalistică vizibilă. Cu o oră înainte de aterizare trimitem WhatsApp cu fotografia consultantului, badge-ul și harta parcării P1 rent-a-car. Ajungi, confirmi codul rezervării, iar cheia preasigurată te așteaptă în pouch sigilat. Consultantul scanează permisul prin NFC și te conduce spre mașina parcată la 50 de metri. Nu există ghișee intermediare, nu completezi hârtii pe loc și economisești minimum douăzeci de minute față de fluxurile clasice.",
    "Programul echipei din Otopeni este 06:00–23:30 zilnic, dar rotația de gardă preia automat zborurile întârziate. Serverul nostru verifică API-ul FlightAware la fiecare două minute; dacă avionul tău se grăbește sau întârzie, actualizăm ora de predare și pregătim mașina cu climatizarea potrivită. Nu percepem taxe suplimentare după miezul nopții. Vei primi SMS cu noua oră estimată, plus reminder pentru traseul spre București și pentru prima benzinărie deschisă. Practic, știi în permanență că mașina și consultantul te așteaptă sincronizați cu statusul real al zborului.",
    "Înainte să aterizezi, verificăm contractul în aplicația internă DaCars și blocăm garanția de 500–900 EUR doar după ce confirmi condițiile pe tabletă. Dacă alegi Protecție Totală, reducem garanția la 0 EUR și trimitem instant confirmarea prin SMS și e-mail. Mașina este fotografiată 360° și încălzită sau răcită după sezon. Îți montăm la cerere scaunul copilului și sincronizăm aplicația de navigație cu destinația finală. În plus, primești link cu recomandări locale: benzinării deschise non-stop, puncte de taxare și numărul direct al managerului de stație.",
];

const FAST_HANDOVER_STEPS = [
    "Înainte de îmbarcare, verificăm rezervarea în platforma DaCars, atașăm copia digitală a permisului și îți trimitem e-mail cu sumarul contractului, garanția estimată și opțiunile de protecție. Tot aici găsești pinul de întâlnire și numărul consultantului de gardă. Pe WhatsApp primești un video de 30 de secunde cu traseul din terminal până la zona rent-a-car, ca să vizualizezi pașii înainte de aterizare. Tu doar confirmi că datele sunt corecte, iar noi pregătim cheia în pouch sigilat și mașina în poziția rezervată.",
    "La aterizare, consultantul urmărește monitorul de zboruri și vine în zona Sosiri cu tabletă și POS mobil. Confirmăm identitatea prin scanare NFC a permisului și comparare biometrică, proces care durează sub un minut. Verificăm pe ecranul tău clasa mașinii, garanția și eventualele servicii suplimentare (scaun copil, rovinietă, Wi-Fi). Semnezi cu degetul pe tabletă, iar sistemul declanșează instant preautorizarea garanției și trimite e-mail cu contractul final. Cheia se deblochează automat prin codul unic din mesajul primit în avion.",
    "Ne deplasăm împreună către parcarea P1 rent-a-car, la mai puțin de un minut de mers, unde mașina este aliniată pe locul marcat cu numărul tău de rezervare. Facem turul foto 360° direct din aplicație, verificăm nivelul combustibilului și setăm climatizarea la temperatura dorită. Consultantul sincronizează navigația cu destinația ta, îți arată butonul de asistență 24/7 și îți oferă un plic cu bonul de parcare. Primești pe SMS link către primele benzinării deschise și un reminder cu procedura de retur, astfel încât să pleci documentat în mai puțin de cinci minute.",
];

const REQUIRED_DOCUMENTS = [
    {
        title: "Act de identitate sau pașaport",
        description:
            "Valabil minimum șase luni. Îl scanăm în aplicație și îl ștergem automat după validare, astfel încât să nu fie nevoie de copii fizice.",
    },
    {
        title: "Permis categoria B",
        description:
            "Emis de cel puțin 12 luni. Acceptăm atât format card, cât și permis vechi, iar verificarea se face prin NFC și comparație biometrică.",
    },
    {
        title: "Card bancar pe numele titularului",
        description:
            "Cu fonduri pentru garanția de 500–900 EUR. Tranzacția este preautorizată, nu debitată, iar confirmarea ajunge pe e-mail și SMS.",
    },
    {
        title: "Voucher sau e-mail de rezervare DaCars",
        description:
            "Cu codul contractului și ora estimată de sosire. Îl poți arăta direct din telefon, fără printuri suplimentare.",
    },
];

const FAQ_ENTRIES: FaqEntryJson[] = [
    {
        question: "Cât durează predarea mașinii în Otopeni?",
        answer:
            "Predarea durează în medie patru minute. Contractul și garanția sunt precompletate, iar la sosire doar confirmi pe tabletă și semnezi cu degetul. Scanarea permisului prin NFC și turul foto 360° se fac pe loc, fără să cauți ghișeu separat. Consultantul te conduce imediat spre parcarea P1, astfel încât pleci rapid spre DN1.",
    },
    {
        question: "Unde ne întâlnim în aeroport?",
        answer:
            "Ne vedem la nivelul Sosiri, lângă cafeneaua „Take Off” și ieșirea către parcarea P1 rent-a-car. Cu o oră înainte primești SMS cu fotografia consultantului și pinul Google Maps. Dacă terminalul este aglomerat, trimitem mesaj pe WhatsApp cu indicații pas cu pas, iar la nevoie rămânem la telefon până ne zărești.",
    },
    {
        question: "Ce program are echipa DaCars Otopeni?",
        answer:
            "Suntem prezenți fizic în aeroport zilnic între 06:00 și 23:30. Pentru zborurile deviate activăm rotația de gardă și ținem linia telefonică +40 741 234 567 deschisă permanent. Primim notificări automate din FlightAware, astfel încât să ajustăm ora de predare fără costuri suplimentare și să te așteptăm chiar dacă aterizezi noaptea târziu.",
    },
    {
        question: "Cum procedăm dacă zborul întârzie sau se grăbește?",
        answer:
            "Platforma noastră verifică statusul zborului la fiecare două minute. Dacă apar întârzieri sau aterizezi mai devreme, consultantul primește alertă, repoziționează mașina și îți trimite SMS cu noua estimare. Contractul rămâne valabil fără penalizări, iar climatizarea mașinii este setată înainte să ieși din terminal, pentru ca timpul tău în Otopeni să rămână predictibil.",
    },
    {
        question: "Ce garanție se blochează pe card?",
        answer:
            "Garanția variază între 500 și 900 EUR în funcție de clasa rezervată și opțiunea de protecție. Folosim preautorizare, nu debităm suma, iar după retur inițiem deblocarea în maximum patru ore. Primești e-mail cu codul tranzacției și SMS când banca eliberează fondurile, ca să poți urmări statusul în aplicația ta.",
    },
    {
        question: "Pot reduce garanția la 0 EUR?",
        answer:
            "Da, pachetul Protecție Totală costă 12 EUR pe zi și aduce garanția la 0 EUR. Include acoperire pentru anvelope, geamuri și asistență rutieră 24/7, plus mașină de înlocuire în cel mult 60 de minute. Activezi pachetul chiar la predare, iar confirmarea ajunge instant pe e-mail și WhatsApp.",
    },
    {
        question: "Ce documente trebuie să am pregătite?",
        answer:
            "Ai nevoie de actul de identitate sau pașaportul valabil minimum șase luni, permis categoria B emis de cel puțin 12 luni și cardul bancar pe numele titularului. Adaugă și voucherul de rezervare primit pe e-mail, pentru verificarea codului. Toate documentele sunt scanate digital și nu trebuie să aduci copii printate.",
    },
    {
        question: "Cum se face returul mașinii?",
        answer:
            "Trimite-ne mesaj cu cel puțin 30 de minute înainte de retur și te așteptăm la aceeași adresă din terminalul Sosiri. Turul de retur durează cinci minute, completăm checklist-ul digital și îți trimitem imediat confirmarea de deblocare a garanției. Dacă pleci spre alt terminal, te ghidăm către shuttle-ul gratuit al aeroportului.",
    },
];

type OtopeniSeoCopy = {
    metaTitle: string;
    metaDescription: string;
    breadcrumbHome: string;
    breadcrumbPage: string;
    heroTitle: string;
    introEyebrow: string;
};

const OTOPENI_SEO_COPY: Partial<Record<Locale, OtopeniSeoCopy>> = {
    ro: {
        metaTitle: `Predare rapidă rent a car Otopeni | ${SITE_NAME}`,
        metaDescription:
            "Predare în sub cinci minute direct în terminalul Sosiri Otopeni, cu contract digital pregătit și consultanți DaCars disponibili 06:00–23:30 pentru zboruri deviate.",
        breadcrumbHome: "Acasă",
        breadcrumbPage: "Predare rapidă Otopeni",
        heroTitle: "Predare rapidă rent a car în Otopeni",
        introEyebrow: "DaCars Otopeni",
    },
};

const resolvePageCopy = async () => {
    const locale = await resolveRequestLocale();
    const copy = OTOPENI_SEO_COPY[locale] ?? OTOPENI_SEO_COPY[FALLBACK_LOCALE];

    return {
        locale,
        copy: copy ?? OTOPENI_SEO_COPY[FALLBACK_LOCALE]!,
    };
};

export async function generateMetadata(): Promise<Metadata> {
    const { locale, copy } = await resolvePageCopy();

    return buildMetadata({
        title: copy.metaTitle,
        description: copy.metaDescription,
        path: PAGE_PATH,
        hreflangLocales: HREFLANG_LOCALES,
        locale,
        openGraphTitle: copy.metaTitle,
        twitterTitle: copy.metaTitle,
    });
}

const OtopeniRapidPage = async () => {
    const { copy } = await resolvePageCopy();

    const structuredData: JsonLd[] = [];
    structuredData.push(
        breadcrumb([
            { name: copy.breadcrumbHome, url: SITE_URL },
            { name: copy.breadcrumbPage, url: `${SITE_URL}${PAGE_PATH}` },
        ]),
    );

    const localBusinessJson = await buildLocalBusinessJsonLd();
    structuredData.push(localBusinessJson);

    const faqJson = buildFaqJsonLd(FAQ_ENTRIES);
    if (faqJson) {
        structuredData.push(faqJson);
    }

    return (
        <div className="bg-slate-50 py-16">
            <StructuredData data={structuredData} id="otopeni-rapid-structured-data" />
            <article className="mx-auto flex max-w-5xl flex-col gap-16 px-4 text-gray-800 sm:px-6 lg:px-0">
                <header className="space-y-4">
                    <span className="text-sm font-semibold uppercase tracking-widest text-berkeley">
                        {copy.introEyebrow}
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{copy.heroTitle}</h1>
                    <p className="text-lg leading-relaxed text-gray-700">{INTRO_PARAGRAPH}</p>
                </header>

                <section aria-labelledby="quote-bullets" className="space-y-6 rounded-xl bg-white p-8 shadow-sm">
                    <h2 id="quote-bullets" className="text-2xl font-semibold text-gray-900">
                        Ce merită citat rapid
                    </h2>
                    <div className="space-y-5">
                        {QUOTE_BULLETS.map((entry) => (
                            <blockquote
                                key={entry}
                                className="border-l-4 border-berkeley/60 bg-berkeley/5 p-5 text-base leading-relaxed"
                            >
                                {entry}
                            </blockquote>
                        ))}
                    </div>
                </section>

                <section aria-labelledby="fast-handover" className="space-y-6">
                    <div className="space-y-2">
                        <h2 id="fast-handover" className="text-2xl font-semibold text-gray-900">
                            Cum predăm în &lt;5 minute
                        </h2>
                        <p className="text-base text-gray-600">
                            Pașii sunt proiectați pentru pasageri care coboară cu bagaje și vor să fie pe DN1 în timp record.
                        </p>
                    </div>
                    <ol className="space-y-5">
                        {FAST_HANDOVER_STEPS.map((step, index) => (
                            <li key={step} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-berkeley">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-berkeley/10 text-base text-berkeley">
                                        {index + 1}
                                    </span>
                                    Pasul {index + 1}
                                </div>
                                <p className="text-base leading-relaxed text-gray-700">{step}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section aria-labelledby="required-docs" className="space-y-6 rounded-xl bg-white p-8 shadow-sm">
                    <h2 id="required-docs" className="text-2xl font-semibold text-gray-900">
                        Ce acte ai nevoie
                    </h2>
                    <ul className="space-y-4">
                        {REQUIRED_DOCUMENTS.map((doc) => (
                            <li key={doc.title} className="text-base leading-relaxed text-gray-700">
                                <strong className="text-gray-900">{doc.title}:</strong> {doc.description}
                            </li>
                        ))}
                    </ul>
                </section>

                <section aria-labelledby="faq" className="space-y-6">
                    <div className="space-y-2">
                        <h2 id="faq" className="text-2xl font-semibold text-gray-900">
                            Întrebări frecvente
                        </h2>
                        <p className="text-base text-gray-600">
                            Răspunsuri structurate pentru a fi citate rapid de LLM-uri și pentru validare Schema.org FAQPage.
                        </p>
                    </div>
                    <div className="space-y-5">
                        {FAQ_ENTRIES.map((item) => (
                            <article key={item.question} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                                <p className="mt-3 text-base leading-relaxed text-gray-700">{item.answer}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section
                    aria-labelledby="cta"
                    className="flex flex-col items-start gap-4 rounded-xl border border-berkeley/30 bg-berkeley/5 p-8 shadow-sm"
                >
                    <div>
                        <h2 id="cta" className="text-2xl font-semibold text-gray-900">
                            Gata să preiei mașina în Otopeni?
                        </h2>
                        <p className="mt-2 text-base text-gray-700">
                            Rezervă online și găsești contractul pregătit înainte să cobori din avion sau sună pentru asistență imediată.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button asChild>
                            <Link href={CTA_PRIMARY_HREF} target="_blank" rel="noreferrer">
                                Rezervă online
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href={`tel:${CTA_PHONE_NUMBER.replace(/\s+/g, "")}`}>
                                Sună {CTA_PHONE_NUMBER}
                            </Link>
                        </Button>
                    </div>
                </section>
            </article>
        </div>
    );
};

export default OtopeniRapidPage;
