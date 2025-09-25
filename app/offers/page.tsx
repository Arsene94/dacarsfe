import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, Gift, Heart, Sparkles, Users } from "lucide-react";
import { ApiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { formatOfferBenefitTitle, normalizeOfferBenefits } from "@/lib/offerBenefits";
import { buildMetadata } from "@/lib/seo/meta";
import { absoluteUrl, siteMetadata } from "@/lib/seo/siteMetadata";
import { createBreadcrumbStructuredData } from "@/lib/seo/structuredData";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import JsonLd from "@/components/seo/JsonLd";
import type { Offer } from "@/types/offer";

const PAGE_TITLE = "Oferte speciale DaCars";
const PAGE_DESCRIPTION =
  "Descoperă promoții active la închirieri auto DaCars: reduceri procentuale, pachete pentru grupuri și beneficii extra pentru clienți fideli.";

const offersMetadata = buildMetadata({
  title: `${PAGE_TITLE} | Reduceri și promoții flexibile pentru închirieri auto`,
  description: PAGE_DESCRIPTION,
  path: "/offers",
  openGraphTitle: `${PAGE_TITLE} – Promoții la închirieri auto DaCars`,
});

export const metadata: Metadata = {
  ...offersMetadata,
};

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
};

const normalizeOffer = (entry: Offer | Record<string, unknown>): PublicOffer | null => {
  const source = entry as Record<string, unknown>;
  const title = parseOptionalString(source.title ?? (source as { name?: unknown }).name);
  if (!title) {
    return null;
  }

  const description = parseOptionalString(source.description);
  const discount = parseOptionalString(
    source.discount_label ?? (source as { discountLabel?: unknown }).discountLabel ?? (source as { badge?: unknown }).badge,
  );
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

  return {
    title,
    description: description ?? undefined,
    discount: discount ?? undefined,
    features: normalizeOfferBenefits(
      source.benefits ??
        (source as { offer_benefits?: unknown }).offer_benefits ??
        (source as { benefits_list?: unknown }).benefits_list,
      collectStringValues(
        source.features ??
          (source as { feature_list?: unknown }).feature_list ??
          (source as { perks?: unknown }).perks ??
          (source as { highlights?: unknown }).highlights,
      ),
    )
      .map((benefit) => formatOfferBenefitTitle(benefit))
      .map((title) => title.trim())
      .filter((title) => title.length > 0),
    backgroundClass: backgroundClass ?? undefined,
    textClass: textClass ?? undefined,
    icon: resolveIcon(source.icon ?? (source as { icon_name?: unknown }).icon_name),
    startsAt: parseOptionalString(source.starts_at ?? (source as { start_at?: unknown }).start_at),
    endsAt: parseOptionalString(source.ends_at ?? (source as { end_at?: unknown }).end_at),
    ctaLabel: ctaLabel ?? undefined,
    ctaHref: ctaHref ?? undefined,
  };
};

const OffersPage = async () => {
  const api = new ApiClient(getApiBaseUrl());
  const response = await api.getOffers({
    audience: "public",
    status: "published",
    sort: "-starts_at,-created_at",
    limit: 20,
  });

  const rawOffers = extractList(response);
  const offers = rawOffers
    .map((offer) => normalizeOffer(offer as Offer))
    .filter((offer): offer is PublicOffer => offer !== null);

  const pageUrl = absoluteUrl("/offers");
  const breadcrumbStructuredData = createBreadcrumbStructuredData([
    { name: "Acasă", item: siteMetadata.siteUrl },
    { name: PAGE_TITLE, item: pageUrl },
  ]);

  const offerCatalogStructuredData =
    offers.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "OfferCatalog",
          name: PAGE_TITLE,
          url: pageUrl,
          description: PAGE_DESCRIPTION,
          itemListElement: offers.map((offer, index) => ({
            "@type": "Offer",
            position: index + 1,
            name: offer.title,
            description: offer.description,
            availabilityStarts: offer.startsAt ?? undefined,
            availabilityEnds: offer.endsAt ?? undefined,
            priceCurrency: "EUR",
            url: absoluteUrl(offer.ctaHref ?? "/checkout"),
            itemOffered: {
              "@type": "Service",
              name: siteMetadata.siteName,
              url: siteMetadata.siteUrl,
            },
          })),
        }
      : null;

  return (
    <div className="bg-slate-50">
      {breadcrumbStructuredData && <JsonLd data={breadcrumbStructuredData} id="dacars-offers-breadcrumb" />}
      {offerCatalogStructuredData && <JsonLd data={offerCatalogStructuredData} id="dacars-offers-catalog" />}

      <section className="bg-berkeley text-white mt-8 py-16">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm uppercase tracking-wide">
            <Sparkles className="h-4 w-4" /> Promoții active
          </div>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{PAGE_TITLE}</h1>
          <p className="text-base text-white/80">{PAGE_DESCRIPTION}</p>
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
                  key={`${offer.title}-${index}`}
                  className={`${offer.backgroundClass ?? "bg-white"} ${offer.textClass ?? "text-berkeley"} relative overflow-hidden rounded-3xl p-8 shadow-lg transition-transform hover:-translate-y-1`}
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

                    <Button asChild className="mt-4 bg-white !text-berkeley hover:!bg-gray-100">
                      <Link href={ctaHref}>{ctaLabel}</Link>
                    </Button>
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
