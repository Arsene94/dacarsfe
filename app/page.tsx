import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SEO } from '@/components/SEO';
import { ORG_LOGO_URL, SITE_NAME, SITE_TWITTER, SUPPORTED_LANGUAGES } from '@/lib/config';
import {
    breadcrumbJsonLd,
    organizationJsonLd,
    websiteJsonLd,
} from '@/lib/seo/jsonld';
import { absolute, canonical } from '@/lib/seo/url';
import { BLOG_POSTS, CAR_LISTINGS, RENTAL_OFFERS } from '@/lib/seo/site-data';

const PATH = '/';
const TITLE = `${SITE_NAME} — Seamless Car Rentals & Offers`;
const DESCRIPTION =
    'Închiriază rapid mașini moderne cu predare 24/7 în București și Otopeni. Tarife dinamice, oferte flexibile și suport dedicat în limba română.';
const HERO_IMAGE = '/images/bg-hero-1920x1080.webp';
const HERO_ALT = 'Șofer închiriind o mașină DaCars în zona de livrare rapidă';

export const generateMetadata = (): Metadata => {
    const canonicalUrl = canonical(PATH);
    const imageUrl = absolute(HERO_IMAGE);

    return {
        title: TITLE,
        description: DESCRIPTION,
        keywords: [
            'închirieri auto București',
            'rent a car Otopeni',
            'oferte închirieri auto',
            'flotă auto corporate',
        ],
        alternates: {
            canonical: canonicalUrl,
            languages: {
                'ro-RO': canonicalUrl,
                en: canonical('/en'),
            },
        },
        openGraph: {
            title: TITLE,
            description: DESCRIPTION,
            url: canonicalUrl,
            type: 'website',
            images: [
                {
                    url: imageUrl,
                    width: 1920,
                    height: 1080,
                    alt: HERO_ALT,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            site: SITE_TWITTER,
            title: TITLE,
            description: DESCRIPTION,
            images: [imageUrl],
        },
    };
};

const homeJsonLd = [
    organizationJsonLd({
        description: DESCRIPTION,
        logo: ORG_LOGO_URL,
        sameAs: [
            'https://www.facebook.com/dacars',
            'https://www.linkedin.com/company/dacars',
            'https://www.instagram.com/dacars.ro',
        ],
        contactPoints: [
            {
                contactType: 'customer support',
                telephone: '+40 755 123 456',
                email: 'contact@dacars.ro',
                areaServed: 'RO',
                availableLanguage: ['ro', 'en'],
            },
        ],
    }),
    websiteJsonLd({
        description: DESCRIPTION,
        searchPath: '/cars',
    }),
    breadcrumbJsonLd([
        {
            name: 'Acasă',
            path: PATH,
        },
    ]),
];

export default function HomePage() {
    return (
        <div className="space-y-24">
            <SEO
                title={TITLE}
                description={DESCRIPTION}
                path={PATH}
                jsonLd={homeJsonLd}
                hreflangLocales={Array.from(SUPPORTED_LANGUAGES)}
                openGraph={{
                    images: [
                        {
                            url: absolute(HERO_IMAGE),
                            width: 1920,
                            height: 1080,
                            alt: HERO_ALT,
                        },
                    ],
                }}
                twitter={{ images: [absolute(HERO_IMAGE)] }}
            />

            <section className="grid gap-12 lg:grid-cols-[1fr,420px] lg:items-center">
                <div className="space-y-8">
                    <p className="text-sm uppercase tracking-[0.3em] text-berkeley-500">
                        Predare 24/7 în București & Otopeni
                    </p>
                    <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
                        Flotă completă pentru fiecare tip de călătorie
                    </h1>
                    <p className="text-lg text-gray-600">
                        De la modele compacte la SUV-uri premium, DaCars îți asigură mașina potrivită în câteva minute.
                        Rezervarea este digitală, tarifele sunt transparente, iar suportul nostru rămâne disponibil non-stop.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/cars"
                            className="rounded-full bg-berkeley-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-berkeley-500"
                        >
                            Vezi flota completă
                        </Link>
                        <Link
                            href="/offers"
                            className="rounded-full border border-berkeley-200 px-6 py-3 font-semibold text-berkeley-700 transition hover:border-berkeley-400"
                        >
                            Descoperă ofertele active
                        </Link>
                    </div>
                    <ul className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-berkeley-500" aria-hidden />
                            150+ mașini verificate tehnic lunar
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-berkeley-500" aria-hidden />
                            Contract digital & check-in rapid în 3 minute
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-berkeley-500" aria-hidden />
                            Livrare gratuită în București și Otopeni
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-berkeley-500" aria-hidden />
                            Asistență 24/7 în română și engleză
                        </li>
                    </ul>
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl">
                    <Image
                        src={HERO_IMAGE}
                        alt={HERO_ALT}
                        fill
                        priority
                        sizes="(min-width: 1280px) 420px, 100vw"
                        className="object-cover"
                    />
                </div>
            </section>

            <section aria-labelledby="fleet-highlight" className="space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="fleet-highlight" className="text-2xl font-semibold text-gray-900">
                            Alege din segmentele populare
                        </h2>
                        <p className="text-gray-600">
                            Toate mașinile vin cu casco, revizii la zi și asistență rutieră inclusă în prețul afișat.
                        </p>
                    </div>
                    <Link
                        href="/cars"
                        className="text-sm font-semibold text-berkeley-600 hover:text-berkeley-500"
                    >
                        Vezi toate modelele
                    </Link>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {CAR_LISTINGS.slice(0, 4).map((car) => (
                        <article
                            key={car.slug}
                            className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-berkeley-400"
                        >
                            <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-gray-50">
                                <Image
                                    src={car.image.src}
                                    alt={car.image.alt}
                                    fill
                                    sizes="(min-width: 1280px) 240px, 50vw"
                                    className="object-contain"
                                />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">{car.name}</h3>
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
                                    <dt className="font-semibold text-gray-700">De la</dt>
                                    <dd>{car.pricePerDay} € / zi</dd>
                                </div>
                            </dl>
                        </article>
                    ))}
                </div>
            </section>

            <section aria-labelledby="offers-highlight" className="space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="offers-highlight" className="text-2xl font-semibold text-gray-900">
                            Oferte active pentru rezervări rapide
                        </h2>
                        <p className="text-gray-600">
                            Promoții limitate și abonamente corporate, actualizate în funcție de cererea reală.
                        </p>
                    </div>
                    <Link
                        href="/offers"
                        className="text-sm font-semibold text-berkeley-600 hover:text-berkeley-500"
                    >
                        Toate ofertele
                    </Link>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {RENTAL_OFFERS.map((offer) => (
                        <article
                            key={offer.slug}
                            className="flex h-full flex-col rounded-2xl border border-berkeley-100 bg-berkeley-50/80 p-6 shadow-sm"
                        >
                            <p className="text-xs uppercase tracking-[0.2em] text-berkeley-500">
                                Valabilă până la {new Date(offer.validThrough).toLocaleDateString('ro-RO')}
                            </p>
                            <h3 className="mt-3 text-xl font-semibold text-berkeley-700">{offer.name}</h3>
                            <p className="mt-2 flex-1 text-sm text-berkeley-800">{offer.description}</p>
                            <div className="mt-4 text-sm font-semibold text-berkeley-700">
                                {offer.price} {offer.priceCurrency}
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section aria-labelledby="blog-highlight" className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="blog-highlight" className="text-2xl font-semibold text-gray-900">
                            Resurse pentru managerii de flotă
                        </h2>
                        <p className="text-gray-600">
                            Sfaturi aplicate despre tarifare dinamică, comunicare și optimizarea operațiunilor.
                        </p>
                    </div>
                    <Link href="/blog" className="text-sm font-semibold text-berkeley-600 hover:text-berkeley-500">
                        Intră pe blog
                    </Link>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {BLOG_POSTS.map((post) => (
                        <article key={post.slug} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6">
                            <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                                {new Date(post.publishedAt).toLocaleDateString('ro-RO')} · {post.category}
                            </p>
                            <h3 className="mt-4 text-lg font-semibold text-gray-900">
                                <Link href={`/blog/${post.slug}`} className="hover:text-berkeley-600">
                                    {post.title}
                                </Link>
                            </h3>
                            <p className="mt-2 flex-1 text-sm text-gray-600">{post.excerpt}</p>
                            <span className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                                {post.author}
                            </span>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-3xl bg-berkeley-900 p-10 text-white shadow-xl">
                <div className="grid gap-8 md:grid-cols-[2fr,1fr] md:items-center">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold">Ai nevoie de un consultant dedicat?</h2>
                        <p className="text-berkeley-100">
                            Echipa noastră preia cererile corporate în maximum 2 ore și personalizează contractele pe durata dorită.
                        </p>
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-berkeley-700 shadow-sm transition hover:bg-berkeley-100"
                        >
                            Contactează-ne acum
                        </Link>
                    </div>
                    <div className="space-y-2 text-sm text-berkeley-100">
                        <p className="font-semibold uppercase tracking-[0.3em] text-berkeley-200">Suport dedicat</p>
                        <p>Email: contact@dacars.ro</p>
                        <p>Telefon: +40 755 123 456</p>
                        <p>Program: Luni - Duminică · 08:00 - 20:00</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
