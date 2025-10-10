import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, Gift, Heart, Sparkles, Users } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import ApplyOfferButton from "@/components/offers/ApplyOfferButton";
import { ApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { formatDate } from "@/lib/datetime";
import { formatOfferBadge } from "@/lib/offers";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { resolveRequestLocale } from "@/lib/i18n/server";
import { buildMetadata } from "@/lib/seo/meta";
import { offerCatalog, type OfferInput, breadcrumb } from "@/lib/seo/jsonld";
import type { Offer, OfferKind } from "@/types/offer";

type OffersSeoCopy = {
  pageTitle: string;
  pageDescription: string;
  metaTitle: string;
  metaDescription: string;
  breadcrumbHome: string;
  breadcrumbOffers: string;
  promotionLabel: string;
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;
const HREFLANG_LOCALES = ["ro", "en", "it", "es", "fr", "de"] as const;

const OFFERS_SEO_COPY: Record<Locale, OffersSeoCopy> = {
  ro: {
    pageTitle: "Oferte speciale DaCars",
    pageDescription:
      "Descoperă promoții active la închirieri auto DaCars: reduceri procentuale, pachete pentru grupuri și beneficii extra pentru clienți fideli.",
    metaTitle: `Oferte și reduceri active | ${SITE_NAME}`,
    metaDescription:
      "Activează economii flexibile, pachete sezoniere și beneficii dedicate clienților fideli DaCars.",
    breadcrumbHome: "Acasă",
    breadcrumbOffers: "Oferte",
    promotionLabel: "Promoții active",
  },
  en: {
    pageTitle: "DaCars Special Offers",
    pageDescription:
      "Explore live rental promotions from DaCars: percentage savings, group bundles, and loyalty extras for frequent drivers.",
    metaTitle: `Current Offers & Discounts | ${SITE_NAME}`,
    metaDescription:
      "Unlock flexible rental savings, seasonal bundles, and loyalty rewards curated by the DaCars team.",
    breadcrumbHome: "Home",
    breadcrumbOffers: "Offers",
    promotionLabel: "Active promotions",
  },
  it: {
    pageTitle: "Offerte speciali DaCars",
    pageDescription:
      "Scopri promozioni attive per i noleggi DaCars: sconti percentuali, pacchetti per gruppi e vantaggi fedeltà dedicati.",
    metaTitle: `Offerte e sconti attivi | ${SITE_NAME}`,
    metaDescription:
      "Attiva risparmi flessibili sul noleggio, pacchetti stagionali e vantaggi fedeltà curati dal team DaCars.",
    breadcrumbHome: "Pagina iniziale",
    breadcrumbOffers: "Offerte",
    promotionLabel: "Promozioni attive",
  },
  es: {
    pageTitle: "Ofertas especiales DaCars",
    pageDescription:
      "Descubre promociones activas de DaCars: descuentos porcentuales, paquetes para grupos y ventajas para clientes fieles.",
    metaTitle: `Ofertas y descuentos vigentes | ${SITE_NAME}`,
    metaDescription:
      "Activa ahorros de alquiler flexibles, paquetes de temporada y recompensas de fidelidad creadas por el equipo DaCars.",
    breadcrumbHome: "Inicio",
    breadcrumbOffers: "Ofertas",
    promotionLabel: "Promociones activas",
  },
  fr: {
    pageTitle: "Offres spéciales DaCars",
    pageDescription:
      "Découvrez les promotions en cours chez DaCars : réductions pourcentages, offres de groupe et avantages fidélité.",
    metaTitle: `Offres et réductions en cours | ${SITE_NAME}`,
    metaDescription:
      "Profitez d'économies flexibles, de packs saisonniers et d'avantages fidélité sélectionnés par l'équipe DaCars.",
    breadcrumbHome: "Accueil",
    breadcrumbOffers: "Offres",
    promotionLabel: "Promotions en cours",
  },
  de: {
    pageTitle: "DaCars Sonderangebote",
    pageDescription:
      "Entdecke aktuelle Mietaktionen von DaCars: prozentuale Rabatte, Gruppenpakete und Treuevorteile für Stammkunden.",
    metaTitle: `Aktuelle Angebote & Rabatte | ${SITE_NAME}`,
    metaDescription:
      "Nutze flexible Mietrabatte, saisonale Bundles und Treuevorteile des DaCars-Teams.",
    breadcrumbHome: "Startseite",
    breadcrumbOffers: "Angebote",
    promotionLabel: "Aktive Aktionen",
  },
};

const resolveOffersSeo = async () => {
  const locale = await resolveRequestLocale();
  const copy = OFFERS_SEO_COPY[locale] ?? OFFERS_SEO_COPY[FALLBACK_LOCALE];
  return { locale, copy };
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale, copy } = await resolveOffersSeo();

  return buildMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: "/offers",
    hreflangLocales: HREFLANG_LOCALES,
    locale,
    openGraphTitle: copy.metaTitle,
    twitterTitle: copy.metaTitle,
  });
}

const STUB_JSONLD_OFFERS: OfferInput[] = [
  {
    name: "Weekend City Escape",
    url: `${SITE_URL}/offers#weekend-city-escape`,
    priceCurrency: "EUR",
    price: "49",
    validFrom: "2024-01-01",
    validThrough: "2024-12-31",
    description: "Sample weekend discount placeholder for structured data.",
  },
  {
    name: "Corporate Fleet Bonus",
    url: `${SITE_URL}/offers#corporate-fleet-bonus`,
    priceCurrency: "EUR",
    price: "75",
    validFrom: "2024-01-01",
    validThrough: "2024-12-31",
    description: "Placeholder corporate bundle offer for future automation.",
  },
];
// TODO: Înlocuiește ofertele stub cu date reale din API-ul public atunci când câmpurile sunt disponibile.

const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const iconMap = {
  heart: Heart,
  users: Users,
  gift: Gift,
  calendar: Calendar,
  sparkles: Sparkles,
} as const;

const collectStringValues = (raw: unknown): string[] => {
  if (raw == null) {
    return [];
  }

  if (typeof raw === "string") {
    return raw
      .split(/[,;\n]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    const normalized = String(raw).trim();
    return normalized.length > 0 ? [normalized] : [];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => collectStringValues(entry));
  }

  if (typeof raw === "object") {
    return collectStringValues(Object.values(raw as Record<string, unknown>));
  }

  return [];
};

const parseOptionalString = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return undefined;
};

const resolveIcon = (value: unknown): keyof typeof iconMap => {
  const candidate = parseOptionalString(value);
  if (!candidate) {
    return "sparkles";
  }
  const normalized = candidate.toLowerCase();
  if (normalized in iconMap) {
    return normalized as keyof typeof iconMap;
  }
  return "sparkles";
};

const formatOfferPeriod = (startsAt?: string | null, endsAt?: string | null): string => {
  if (!startsAt && !endsAt) {
    return "Disponibilă permanent";
  }
  if (startsAt && endsAt) {
    return `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
  }
  if (startsAt) {
    return `Valabilă din ${formatDate(startsAt)}`;
  }
  return `Valabilă până la ${formatDate(endsAt)}`;
};

type PublicOffer = {
  id?: number;
  title: string;
  description?: string;
  discount?: string;
  features: string[];
  backgroundClass?: string;
  textClass?: string;
  icon: keyof typeof iconMap;
  startsAt?: string | null;
  endsAt?: string | null;
  ctaLabel?: string;
  ctaHref?: string;
  offerType?: OfferKind | null;
  offerValue?: string | null;
};

const normalizeOffer = (entry: Offer | Record<string, unknown>): PublicOffer | null => {
  const source = entry as Record<string, unknown>;
  const idCandidate = source.id ?? (source as { offer_id?: unknown }).offer_id;
  const id = typeof idCandidate === "number" ? idCandidate : Number(idCandidate);
  const title = parseOptionalString(source.title ?? (source as { name?: unknown }).name);
  if (!title) {
    return null;
  }

  const description = parseOptionalString(source.description);
  const offerType = parseOptionalString(
    source.offer_type ?? (source as { offerType?: unknown }).offerType,
  ) as OfferKind | undefined;
  const offerValue = parseOptionalString(
    source.offer_value ?? (source as { offerValue?: unknown }).offerValue,
  );
  const discount =
    parseOptionalString(
      source.discount_label ??
        (source as { discountLabel?: unknown }).discountLabel ??
        (source as { badge?: unknown }).badge,
    ) ?? formatOfferBadge(offerType ?? null, offerValue ?? null) ?? undefined;
  const backgroundClass = parseOptionalString(
    source.background_class ?? (source as { backgroundClass?: unknown }).backgroundClass,
  );
  const textClass = parseOptionalString(source.text_class ?? (source as { textClass?: unknown }).textClass);
  const ctaLabel = parseOptionalString(
    source.primary_cta_label ?? (source as { primaryCtaLabel?: unknown }).primaryCtaLabel ?? (source as { cta_label?: unknown }).cta_label,
  );
  const ctaHref = parseOptionalString(
    source.primary_cta_url ?? (source as { primaryCtaUrl?: unknown }).primaryCtaUrl ?? (source as { cta_url?: unknown }).cta_url,
  );

  const upgradeNote =
    "Upgrade-ul gratuit este disponibil în limita stocului și se confirmă telefonic după trimiterea cererii de rezervare.";

  const features = (() => {
    const benefits = collectStringValues(
      source.benefits ??
        (source as { offer_benefits?: unknown }).offer_benefits ??
        (source as { benefits_list?: unknown }).benefits_list,
    );
    const fallback = collectStringValues(
      source.features ??
        (source as { feature_list?: unknown }).feature_list ??
        (source as { perks?: unknown }).perks ??
        (source as { highlights?: unknown }).highlights,
    );
    const list = benefits.length > 0 ? benefits : fallback;
    if ((offerType ?? null) === "free_service_upgrade") {
      if (!list.some((entry) => entry.toLowerCase().includes("upgrade-ul gratuit"))) {
        return [...list, upgradeNote];
      }
    }
    return list;
  })();

  return {
    id: Number.isFinite(id) ? Number(id) : undefined,
    title,
    description: description ?? undefined,
    discount: discount ?? undefined,
    features,
    backgroundClass: backgroundClass ?? undefined,
    textClass: textClass ?? undefined,
    icon: resolveIcon(source.icon ?? (source as { icon_name?: unknown }).icon_name),
    startsAt: parseOptionalString(source.starts_at ?? (source as { start_at?: unknown }).start_at),
    endsAt: parseOptionalString(source.ends_at ?? (source as { end_at?: unknown }).end_at),
    ctaLabel: ctaLabel ?? undefined,
    ctaHref: ctaHref ?? undefined,
    offerType: offerType ?? null,
    offerValue: offerValue ?? null,
  };
};

const extractOfferPrice = (raw: string | null | undefined): string => {
  if (!raw) {
    return "0";
  }
  const match = String(raw).match(/[0-9]+(?:[.,][0-9]+)?/);
  return match ? match[0].replace(",", ".") : "0";
};

const toAbsoluteOfferUrl = (href?: string): string => {
  if (!href) {
    return `${SITE_URL}/checkout`;
  }

  try {
    return new URL(href, SITE_URL).toString();
  } catch {
    return `${SITE_URL}/checkout`;
  }
};

const mapOfferToJsonLdInput = (offer: PublicOffer): OfferInput => ({
  name: offer.title,
  url: toAbsoluteOfferUrl(offer.ctaHref),
  priceCurrency: "EUR",
  price: extractOfferPrice(offer.offerValue ?? offer.discount ?? null),
  validFrom: offer.startsAt ?? undefined,
  validThrough: offer.endsAt ?? undefined,
  description: offer.description,
});

const OffersPage = async () => {
  const { copy } = await resolveOffersSeo();
  const api = new ApiClient(getApiBaseUrl());
  let rawOffers: unknown[] = [];
  try {
    const response = await api.getOffers({
      audience: "public",
      status: "published",
      sort: "-starts_at,-created_at",
      limit: 20,
    });
    rawOffers = extractList(response);
  } catch (error) {
    console.error("Nu s-au putut încărca ofertele publice", error);
    rawOffers = [];
  }
  const offers = rawOffers
    .map((offer) => normalizeOffer(offer as Offer))
    .filter((offer): offer is PublicOffer => offer !== null);

  const jsonLdOffers = offers.length > 0 ? offers.map(mapOfferToJsonLdInput) : STUB_JSONLD_OFFERS;

  const structuredData = [
    offerCatalog({
      name: copy.metaTitle,
      description: copy.metaDescription,
      url: `${SITE_URL}/offers`,
      offers: jsonLdOffers,
    }),
    breadcrumb([
      { name: copy.breadcrumbHome, url: SITE_URL },
      { name: copy.breadcrumbOffers, url: `${SITE_URL}/offers` },
    ]),
  ];

  return (
    <div className="bg-slate-50">
      <StructuredData data={structuredData} id="offers-structured-data" />

      <section className="bg-berkeley text-white mt-8 py-16">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> {copy.promotionLabel}
          </div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{copy.pageTitle}</h1>
          <p className="text-base text-white/80">{copy.pageDescription}</p>
        </div>
      </section>

      <section className="mx-auto -mt-10 flex max-w-5xl flex-col gap-4 rounded-3xl border border-white/60 bg-white px-6 py-6 text-center shadow-lg">
        <p className="text-sm text-gray-700">
          Caută rapid informațiile esențiale despre promoții și continuă spre celelalte pagini pilot DaCars.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/faq"
            className="inline-flex items-center rounded-full border border-berkeley px-4 py-2 text-sm font-semibold text-berkeley transition hover:bg-berkeley hover:text-white"
          >
            Întrebări frecvente despre reduceri
          </Link>
          <Link
            href="/cars"
            className="inline-flex items-center rounded-full border border-jade px-4 py-2 text-sm font-semibold text-jade transition hover:bg-jade hover:text-white"
          >
            Verifică disponibilitatea flotei
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full bg-berkeley px-4 py-2 text-sm font-semibold text-white transition hover:bg-berkeley/90"
          >
            Cere o ofertă personalizată
          </Link>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
        {offers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-berkeley/30 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-berkeley">Nu avem oferte active momentan</h2>
            <p className="mt-3 text-sm text-gray-600">
              Revino în curând sau contactează echipa DaCars pentru o ofertă personalizată.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/checkout">Rezervă o mașină</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Contactează-ne</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {offers.map((offer, index) => {
              const Icon = iconMap[offer.icon] ?? Sparkles;
              const periodLabel = formatOfferPeriod(offer.startsAt, offer.endsAt);
              const ctaLabel = offer.ctaLabel ?? "Solicită oferta";
              const ctaHref = offer.ctaHref ?? "/checkout";

              return (
                <article
                  key={`${offer.id ?? offer.title}-${index}`}
                  className={`group transform hover:scale-105 transition-all duration-300 animate-slide-up ${offer.backgroundClass ?? "bg-white"} ${offer.textClass ?? "text-berkeley"} relative overflow-hidden rounded-3xl p-8 shadow-lg hover:-translate-y-1`}
                  style={{ animationDelay: "0s" }}
                >
                  <div className="absolute inset-0 bg-black/5 mix-blend-multiply" aria-hidden="true" />
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/20 p-3">
                          <Icon className="h-8 w-8" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-semibold">{offer.title}</h2>
                          {offer.discount && (
                            <p className="text-lg font-medium text-white/90">{offer.discount}</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase tracking-wide">
                        {periodLabel}
                      </div>
                    </div>

                    {offer.description && (
                      <p className="text-sm leading-relaxed text-white/90">{offer.description}</p>
                    )}

                    {offer.features.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {offer.features.map((feature, featureIndex) => (
                          <li key={`${offer.title}-feature-${featureIndex}`} className="flex items-start gap-2">
                            <Gift className="mt-1 h-4 w-4 text-yellow-300" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <ApplyOfferButton
                      className="mt-4 bg-white !text-berkeley hover:!bg-gray-100"
                      href={ctaHref ?? "/checkout"}
                      label={ctaLabel}
                      ariaLabel={ctaLabel}
                      offer={
                        typeof offer.id === "number"
                          ? {
                              id: offer.id,
                              title: offer.title,
                              kind: offer.offerType ?? null,
                              value: offer.offerValue ?? null,
                              badge: offer.discount ?? null,
                            }
                          : null
                      }
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default OffersPage;
