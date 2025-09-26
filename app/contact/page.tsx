import type { Metadata } from 'next';
import Link from 'next/link';

import { SEO } from '@/components/SEO';
import { SITE_NAME, SUPPORTED_LANGUAGES } from '@/lib/config';
import { breadcrumbJsonLd, contactPageJsonLd, organizationJsonLd } from '@/lib/seo/jsonld';
import { absolute, canonical } from '@/lib/seo/url';
import { CONTACT_INFO } from '@/lib/seo/site-data';

const PATH = '/contact';
const TITLE = `Contact | ${SITE_NAME}`;
const DESCRIPTION =
    'Suntem disponibili zilnic pentru rezervări urgente, suport corporate și întrebări despre flota DaCars. Răspundem în maximum 2 ore.';

export const generateMetadata = (): Metadata => {
    const canonicalUrl = canonical(PATH);

    return {
        title: TITLE,
        description: DESCRIPTION,
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'ro-RO': canonicalUrl,
                en: canonical('/en/contact'),
            },
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            url: canonicalUrl,
            type: 'website',
            images: [
                {
                    url: absolute('/images/bg-hero-320x240.webp'),
                    width: 320,
                    height: 240,
                    alt: 'Biroul de suport DaCars din București',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: TITLE,
            description: DESCRIPTION,
            images: [absolute('/images/bg-hero-320x240.webp')],
        },
    };
};

const contactJsonLd = [
    contactPageJsonLd({
        name: TITLE,
        description: DESCRIPTION,
        path: PATH,
        contactPoints: [
            {
                contactType: 'customer support',
                telephone: CONTACT_INFO.phone,
                email: CONTACT_INFO.email,
                areaServed: 'RO',
                availableLanguage: ['ro', 'en'],
            },
        ],
    }),
    organizationJsonLd({
        description: 'Partenerul tău de închirieri auto cu livrare rapidă și contracte flexibile.',
        contactPoints: [
            {
                contactType: 'sales',
                telephone: CONTACT_INFO.phone,
                email: CONTACT_INFO.email,
                areaServed: 'RO',
                availableLanguage: ['ro', 'en'],
            },
        ],
    }),
    breadcrumbJsonLd([
        { name: 'Acasă', path: '/' },
        { name: 'Contact', path: PATH },
    ]),
];

export default function ContactPage() {
    return (
        <div className="space-y-16">
            <SEO
                title={TITLE}
                description={DESCRIPTION}
                path={PATH}
                jsonLd={contactJsonLd}
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
                openGraph={{
                    images: [
                        {
                            url: absolute('/images/bg-hero-320x240.webp'),
                            width: 320,
                            height: 240,
                            alt: 'Biroul de suport DaCars din București',
                        },
                    ],
                }}
                twitter={{ images: [absolute('/images/bg-hero-320x240.webp')] }}
            />

            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley-600">
                            Acasă
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li className="font-semibold text-gray-900">Contact</li>
                </ol>
            </nav>

            <header className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Hai să discutăm despre următoarea rezervare</h1>
                <p className="max-w-2xl text-lg text-gray-600">
                    Echipa DaCars răspunde în maximum 2 ore în zilele lucrătoare și până la 4 ore în weekend. Suntem disponibili
                    pentru flote corporate, întrebări despre predare și suport în caz de incident.
                </p>
            </header>

            <section className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">Date de contact</h2>
                    <dl className="mt-6 space-y-4 text-sm text-gray-600">
                        <div>
                            <dt className="font-semibold text-gray-800">Telefon</dt>
                            <dd>
                                <Link href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, '')}`} className="text-berkeley-600 hover:text-berkeley-500">
                                    {CONTACT_INFO.phone}
                                </Link>
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-gray-800">Email</dt>
                            <dd>
                                <Link href={`mailto:${CONTACT_INFO.email}`} className="text-berkeley-600 hover:text-berkeley-500">
                                    {CONTACT_INFO.email}
                                </Link>
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-gray-800">Adresă</dt>
                            <dd>
                                {CONTACT_INFO.street}, {CONTACT_INFO.city}, {CONTACT_INFO.region} {CONTACT_INFO.postalCode}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-gray-800">Program</dt>
                            <dd>
                                Luni - Vineri: {CONTACT_INFO.openingHours.weekdays}
                                <br />
                                Sâmbătă - Duminică: {CONTACT_INFO.openingHours.weekend}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div className="space-y-6 rounded-3xl bg-berkeley-900 p-8 text-white">
                    <h2 className="text-xl font-semibold">Trimite-ne o solicitare rapidă</h2>
                    <form className="space-y-4" aria-label="Formular de contact">
                        <label className="block text-sm">
                            <span className="font-semibold">Nume complet</span>
                            <input
                                type="text"
                                className="mt-2 w-full rounded-xl border border-berkeley-200 bg-white/10 px-4 py-3 text-white placeholder:text-berkeley-200 focus:border-white focus:outline-none"
                                placeholder="Nume și prenume"
                                required
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="font-semibold">Email</span>
                            <input
                                type="email"
                                className="mt-2 w-full rounded-xl border border-berkeley-200 bg-white/10 px-4 py-3 text-white placeholder:text-berkeley-200 focus:border-white focus:outline-none"
                                placeholder="adresa@companie.ro"
                                required
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="font-semibold">Mesaj</span>
                            <textarea
                                className="mt-2 h-32 w-full rounded-xl border border-berkeley-200 bg-white/10 px-4 py-3 text-white placeholder:text-berkeley-200 focus:border-white focus:outline-none"
                                placeholder="Detaliază cererea ta"
                                required
                            />
                        </label>
                        <button
                            type="submit"
                            className="w-full rounded-full bg-white px-6 py-3 font-semibold text-berkeley-700 shadow-sm transition hover:bg-berkeley-100"
                        >
                            Trimite mesajul
                        </button>
                    </form>
                    <p className="text-sm text-berkeley-100">
                        Răspundem în maximum 2 ore în intervalul orar {CONTACT_INFO.openingHours.weekdays}. Pentru urgențe, sună-ne
                        direct la {CONTACT_INFO.phone}.
                    </p>
                </div>
            </section>
        </div>
    );
}
