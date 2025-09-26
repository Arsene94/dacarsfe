import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SEO } from '@/components/SEO';
import { SITE_NAME, SUPPORTED_LANGUAGES } from '@/lib/config';
import { breadcrumbJsonLd, offerCatalogJsonLd } from '@/lib/seo/jsonld';
import { absolute, canonical } from '@/lib/seo/url';
import { CAR_LISTINGS, RENTAL_OFFERS } from '@/lib/seo/site-data';

const PATH = '/offers';
const TITLE = `Current Offers & Discounts | ${SITE_NAME}`;
const DESCRIPTION =
    'Reduceri temporare, pachete corporate și promoții pentru gama electrică. Actualizăm ofertele în timp real în funcție de cerere.';

export const generateMetadata = (): Metadata => {
    const canonicalUrl = canonical(PATH);

    return {
        title: TITLE,
        description: DESCRIPTION,
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'ro-RO': canonicalUrl,
                en: canonical('/en/offers'),
            },
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            url: canonicalUrl,
            type: 'website',
            images: [
                {
                    url: absolute('/images/bg-hero-520x380.webp'),
                    width: 520,
                    height: 380,
                    alt: 'Ofertă promoțională DaCars pentru închirieri auto',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: TITLE,
            description: DESCRIPTION,
            images: [absolute('/images/bg-hero-520x380.webp')],
        },
    };
};

const offersJsonLd = [
    offerCatalogJsonLd({
        name: TITLE,
        description: DESCRIPTION,
        path: PATH,
        offers: RENTAL_OFFERS.map((offer) => ({
            name: offer.name,
            url: `/offers#${offer.slug}`,
            priceCurrency: offer.priceCurrency,
            price: offer.price,
            validFrom: offer.validFrom,
            validThrough: offer.validThrough,
            category: offer.category,
        })),
    }),
    breadcrumbJsonLd([
        { name: 'Acasă', path: '/' },
        { name: 'Oferte', path: PATH },
    ]),
];

export default function OffersPage() {
    return (
        <div className="space-y-16">
            <SEO
                title={TITLE}
                description={DESCRIPTION}
                path={PATH}
                jsonLd={offersJsonLd}
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
                openGraph={{
                    images: [
                        {
                            url: absolute('/images/bg-hero-520x380.webp'),
                            width: 520,
                            height: 380,
                            alt: 'Ofertă promoțională DaCars pentru închirieri auto',
                        },
                    ],
                }}
                twitter={{ images: [absolute('/images/bg-hero-520x380.webp')] }}
            />

            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley-600">
                            Acasă
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li className="font-semibold text-gray-900">Oferte</li>
                </ol>
            </nav>

            <header className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Promoții și abonamente flexibile</h1>
                <p className="max-w-2xl text-lg text-gray-600">
                    Ajustăm campaniile în funcție de cerere: discounturi pentru weekend, abonamente corporate și stimulente pentru
                    flota electrică. Rezervările online preiau automat tarifele actualizate.
                </p>
            </header>

            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {RENTAL_OFFERS.map((offer) => {
                    const relatedCar = CAR_LISTINGS.find((car) => car.slug === offer.relatedCar);
                    return (
                        <article
                            key={offer.slug}
                            id={offer.slug}
                            className="flex h-full flex-col justify-between rounded-3xl border border-berkeley-100 bg-white p-6 shadow-sm"
                        >
                            <div className="space-y-4">
                                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-berkeley-50">
                                    <Image
                                        src={relatedCar?.image.src ?? '/images/placeholder-car.svg'}
                                        alt={relatedCar?.image.alt ?? 'Vehicul din flota DaCars'}
                                        fill
                                        sizes="(min-width: 1280px) 320px, 50vw"
                                        className="object-contain"
                                    />
                                </div>
                                <p className="text-xs uppercase tracking-[0.3em] text-berkeley-500">
                                    Valabilă până la {new Date(offer.validThrough).toLocaleDateString('ro-RO')}
                                </p>
                                <h2 className="text-xl font-semibold text-gray-900">{offer.name}</h2>
                                <p className="text-sm text-gray-600">{offer.description}</p>
                            </div>
                            <div className="mt-6 space-y-4">
                                <div className="text-lg font-semibold text-berkeley-700">
                                    {offer.price} {offer.priceCurrency}
                                </div>
                                <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Categorie · {offer.category}</div>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <Link href={`/cars#${offer.relatedCar}`} className="font-semibold text-berkeley-600 hover:text-berkeley-500">
                                        Vezi mașina recomandată
                                    </Link>
                                    <Link href="/blog" className="font-semibold text-berkeley-600 hover:text-berkeley-500">
                                        Citește ghidul dedicat
                                    </Link>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>

            <section className="rounded-2xl bg-berkeley-900 p-8 text-white">
                <h2 className="text-xl font-semibold">Cum folosim datele pentru tarife dinamice</h2>
                <p className="mt-3 max-w-2xl text-berkeley-100">
                    Monitorizăm gradul de ocupare, evoluția costurilor de combustibil și calendarul de evenimente pentru a ajusta
                    automat prețurile. Pentru clienți corporate pregătim rapoarte lunare cu economiile realizate.
                </p>
            </section>
        </div>
    );
}
