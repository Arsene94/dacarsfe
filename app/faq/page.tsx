import type { Metadata } from 'next';

import { SEO } from '@/components/SEO';
import { SUPPORTED_LANGUAGES } from '@/lib/config';
import { buildFaqJsonLd } from '@/lib/seo/jsonld';
import { canonical, hreflangLinks } from '@/lib/seo/url';

const FAQ_ENTRIES = [
    {
        question: 'Cum se calculează tarifele dinamice în DaCars?',
        answer: 'Tarifele sunt actualizate în timp real pe baza ocupării flotei, a cererii istorice și a regulilor definite în panoul de administrare.',
    },
    {
        question: 'Pot integra plățile online cu furnizorii existenți?',
        answer: 'Da, platforma oferă webhook-uri standard și conectare cu Stripe, Netopia și PayU. Pentru alți furnizori folosiți adaptorul custom din secțiunea Integrări.',
    },
    {
        question: 'Ce rapoarte pot exporta din modulul de analitice?',
        answer: 'Managerii pot exporta rapoarte CSV sau PDF pentru ocupare, venituri recurente, costuri de mentenanță și satisfacția clienților.',
    },
    {
        question: 'Cum gestionez drepturile de acces pentru echipă?',
        answer: 'Din Consola Admin > Setări > Roluri puteți crea roluri personalizate, controla permisiunile pe module și atribui acces granular fiecărui membru.',
    },
    {
        question: 'Există suport multi-limbă pentru website-ul public?',
        answer: 'Da, secțiunea Website Builder permite definirea conținutului în mai multe limbi și maparea automată a SEO metadata pentru fiecare localizare.',
    },
    {
        question: 'Pot să-mi sincronizez flota cu marketplace-uri externe?',
        answer: 'DaCars oferă conectori pentru Booking.com, Rentalcars și API-uri custom. Sincronizarea se face la fiecare 15 minute sau la cerere.',
    },
    {
        question: 'Cum funcționează automatizările de comunicare?',
        answer: 'Trigger-ele pot fi configurate pentru confirmări, remindere de check-in, upsell-uri și follow-up post-închiriere, folosind email, SMS și WhatsApp.',
    },
    {
        question: 'Este disponibilă o aplicație mobilă pentru șoferi?',
        answer: 'Da, aplicația companion pentru șoferi trimite task-uri de predare, checklist-uri foto și rapoarte de incidente în timp real.',
    },
    {
        question: 'Cum pot importa istoricul rezervărilor dintr-un CRM extern?',
        answer: 'Folosiți wizard-ul de migrare din setări. Acceptă fișiere CSV, XLSX sau conexiune directă la API. Se validează automat câmpurile obligatorii.',
    },
    {
        question: 'Ce SLA oferiți pentru clienții enterprise?',
        answer: 'Pachetul Enterprise include SLA 99.9%, suport dedicat 24/7 și audit trimestrial de securitate.',
    },
] as const;

const TITLE = 'Întrebări frecvente despre DaCars';
const DESCRIPTION = 'Răspunsuri clare despre platforma DaCars: tarife, automatizări, integrări și suportul oferit clienților.';

export const generateMetadata = (): Metadata => {
    const canonicalUrl = canonical('/faq');
    const hreflangEntries = hreflangLinks(Array.from(SUPPORTED_LANGUAGES), '/faq');

    return {
        title: TITLE,
        description: DESCRIPTION,
        alternates: {
            canonical: canonicalUrl,
            languages: Object.fromEntries(hreflangEntries.map((entry) => [entry.hrefLang, entry.href])),
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            type: 'website',
            url: canonicalUrl,
        },
        twitter: {
            card: 'summary_large_image',
            title: TITLE,
            description: DESCRIPTION,
        },
    };
};

export default function FAQPage() {
    const faqSchema = buildFaqJsonLd(FAQ_ENTRIES);

    return (
        <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 lg:py-16">
            <SEO
                title={TITLE}
                description={DESCRIPTION}
                path="/faq"
                jsonLd={faqSchema}
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
            />
            <header className="space-y-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-berkeley-500">Suport DaCars</p>
                <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">Întrebări frecvente</h1>
                <p className="text-lg text-gray-600">
                    Acest ghid este actualizat lunar și acoperă cele mai cerute informații despre operațiunile zilnice din platformă.
                </p>
            </header>

            <section aria-label="Întrebări și răspunsuri" className="space-y-4">
                {FAQ_ENTRIES.map((entry, index) => (
                    <details
                        key={entry.question}
                        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-berkeley-300"
                    >
                        <summary className="cursor-pointer text-lg font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-berkeley-400">
                            {index + 1}. {entry.question}
                        </summary>
                        <div className="pt-3 text-gray-700">
                            <p>{entry.answer}</p>
                        </div>
                    </details>
                ))}
            </section>

            <footer className="rounded-md border border-berkeley-100 bg-berkeley-50 p-6 text-sm text-berkeley-900">
                Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}.
                Pentru alte clarificări contactați echipa la <a className="font-semibold text-berkeley-600" href="mailto:support@dacars.ro">support@dacars.ro</a>.
            </footer>
        </div>
    );
}
