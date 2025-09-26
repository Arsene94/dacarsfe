import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SEO } from '@/components/SEO';
import { SITE_NAME, SUPPORTED_LANGUAGES } from '@/lib/config';
import {
    breadcrumbJsonLd,
    collectionPageJsonLd,
    offerJsonLd,
} from '@/lib/seo/jsonld';
import { absolute, canonical } from '@/lib/seo/url';
import { CAR_LISTINGS } from '@/lib/seo/site-data';

const PATH = '/cars';
const TITLE = `Browse Cars | ${SITE_NAME}`;
const DESCRIPTION =
    'Explorează flota DaCars: mașini compacte, SUV-uri de familie și modele premium cu tarife dinamice și disponibilitate în timp real.';

export const generateMetadata = (): Metadata => {
    const canonicalUrl = canonical(PATH);

    return {
        title: TITLE,
        description: DESCRIPTION,
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'ro-RO': canonicalUrl,
                en: canonical('/en/cars'),
            },
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            url: canonicalUrl,
            type: 'website',
            images: [
                {
                    url: absolute('/images/placeholder-car.svg'),
                    width: 640,
                    height: 360,
                    alt: 'Selecție de mașini din flota DaCars',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: TITLE,
            description: DESCRIPTION,
            images: [absolute('/images/placeholder-car.svg')],
        },
    };
};

const carsJsonLd = [
    collectionPageJsonLd({
        name: 'Flotă DaCars disponibilă',
        description: DESCRIPTION,
        path: PATH,
        items: CAR_LISTINGS.map((car) => ({
            name: car.name,
            url: `/cars#${car.slug}`,
            image: car.image.src,
            brand: car.brand,
            offers: offerJsonLd({
                name: `${car.name} - tarif pe zi`,
                price: car.pricePerDay,
                priceCurrency: 'EUR',
                url: `/cars#${car.slug}`,
                validFrom: '2025-01-01',
                category: 'daily',
            }),
        })),
    }),
    breadcrumbJsonLd([
        { name: 'Acasă', path: '/' },
        { name: 'Flotă auto', path: PATH },
    ]),
];

export default function CarsPage() {
    return (
        <div className="space-y-16">
            <SEO
                title={TITLE}
                description={DESCRIPTION}
                path={PATH}
                jsonLd={carsJsonLd}
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
                links={[
                    { rel: 'prev', href: canonical('/cars?page=1') },
                    { rel: 'next', href: canonical('/cars?page=2') },
                ]}
                openGraph={{
                    images: [
                        {
                            url: absolute('/images/placeholder-car.svg'),
                            width: 640,
                            height: 360,
                            alt: 'Selecție de mașini din flota DaCars',
                        },
                    ],
                }}
                twitter={{ images: [absolute('/images/placeholder-car.svg')] }}
            />

            <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
                <ol className="flex flex-wrap items-center gap-2">
                    <li>
                        <Link href="/" className="hover:text-berkeley-600">
                            Acasă
                        </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li className="font-semibold text-gray-900">Flotă auto</li>
                </ol>
            </nav>

            <header className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Flotă disponibilă pentru rezervare imediată</h1>
                <p className="max-w-2xl text-lg text-gray-600">
                    Selectăm doar modele verificate tehnic și actualizăm disponibilitatea în timp real. Folosește filtrele pentru
                    a găsi rapid mașina potrivită pentru oraș, business sau concediu.
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="rounded-full border border-gray-300 px-4 py-2">Compacte</span>
                    <span className="rounded-full border border-gray-300 px-4 py-2">SUV &amp; 4x4</span>
                    <span className="rounded-full border border-gray-300 px-4 py-2">Premium &amp; corporate</span>
                    <span className="rounded-full border border-gray-300 px-4 py-2">Electrice</span>
                </div>
            </header>

            <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
                <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900">Filtre rapide</h2>
                    <form className="space-y-4" aria-label="Filtrează flotă">
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold text-gray-700">Transmisie</legend>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" defaultChecked aria-label="Automată" /> Automată
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" aria-label="Manuală" /> Manuală
                            </label>
                        </fieldset>
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold text-gray-700">Combustibil</legend>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" defaultChecked aria-label="Benzină" /> Benzină
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" aria-label="Motorină" /> Motorină
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input type="checkbox" aria-label="Hibrid" /> Hibrid
                            </label>
                        </fieldset>
                    </form>
                    <p className="text-xs text-gray-500">
                        *Prețurile afișate includ TVA, CASCO și kilometraj standard. Reducerile se aplică automat în pasul de
                        checkout.
                    </p>
                </aside>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {CAR_LISTINGS.map((car) => (
                        <article
                            key={car.slug}
                            id={car.slug}
                            className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-berkeley-400"
                        >
                            <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-gray-50">
                                <Image
                                    src={car.image.src}
                                    alt={car.image.alt}
                                    fill
                                    sizes="(min-width: 1280px) 320px, 50vw"
                                    className="object-contain"
                                />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">{car.name}</h2>
                            <p className="mt-2 flex-1 text-sm text-gray-600">{car.description}</p>
                            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <div>
                                    <dt className="font-semibold text-gray-700">Brand</dt>
                                    <dd>{car.brand}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-gray-700">Locuri</dt>
                                    <dd>{car.seats}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-gray-700">Transmisie</dt>
                                    <dd>{car.transmission}</dd>
                                </div>
                                <div>
                                    <dt className="font-semibold text-gray-700">Tarif / zi</dt>
                                    <dd>{car.pricePerDay} €</dd>
                                </div>
                            </dl>
                            <Link
                                href={`/offers#${car.slug}`}
                                className="mt-6 inline-flex items-center justify-center rounded-full bg-berkeley-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-berkeley-500"
                            >
                                Vezi oferte disponibile
                            </Link>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
