"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { cn } from "@/lib/utils";

type InterlinkingMessages = {
    title?: { main?: string; highlight?: string };
    description?: string;
    links?: Array<{
        href?: string;
        label?: string;
        description?: string;
        tone?: "primary" | "secondary" | "accent" | "outline";
    }>;
};

const FALLBACK_LINKS: Required<InterlinkingMessages>["links"] = [
    {
        href: "/cars",
        label: "Flota de mașini disponibile",
        description: "Filtrează peste 50 de modele și confirmă disponibilitatea în timp real.",
        tone: "primary",
    },
    {
        href: "/offers",
        label: "Promoții și reduceri active",
        description: "Activează coduri de discount și beneficii dedicate clienților DaCars.",
        tone: "accent",
    },
    {
        href: "/faq",
        label: "Întrebări frecvente",
        description: "Află politicile de depozit, condițiile de preluare și opțiunile de plată.",
        tone: "outline",
    },
    {
        href: "/blog",
        label: "Resurse și ghiduri DaCars",
        description: "Descoperă sfaturi de mobilitate și actualizări directe din echipa noastră.",
        tone: "secondary",
    },
];

const toneClassMap: Record<NonNullable<InterlinkingMessages["links"]>[number]["tone"], string> = {
    primary: "border-berkeley text-berkeley hover:bg-berkeley hover:text-white",
    accent: "border-jade text-jade hover:bg-jade hover:text-white",
    secondary: "border-berkeley/20 text-berkeley hover:border-berkeley hover:bg-berkeley/5",
    outline: "border-gray-200 text-gray-700 hover:bg-gray-100",
};

const HomeInterlinkingSection = () => {
    const { messages, t } = useTranslations("home");
    const interlinking = (messages.interlinking ?? {}) as InterlinkingMessages;

    const titleMain = interlinking.title?.main ?? t("interlinking.title.main", {
        fallback: "Continuă explorarea DaCars",
    });
    const titleHighlight = interlinking.title?.highlight ?? t("interlinking.title.highlight", {
        fallback: "cu pagini esențiale",
    });
    const description = interlinking.description ??
        t("interlinking.description", {
            fallback:
                "Accesează rapid cele mai vizitate pagini și finalizează rezervarea fără să pierzi informații importante.",
        });

    const resolvedLinks = (Array.isArray(interlinking.links) ? interlinking.links : FALLBACK_LINKS)
        .map((link) => ({
            ...link,
            href: link.href ?? FALLBACK_LINKS.find((item) => item.label === link.label)?.href ?? "/",
            tone: link.tone ?? "primary",
        }))
        .filter((link) => (link.href?.trim().length ?? 0) > 0 && (link.label?.trim().length ?? 0) > 0);

    const linksToRender = resolvedLinks.length > 0 ? resolvedLinks : FALLBACK_LINKS;

    return (
        <section className="bg-white py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-12 max-w-3xl text-center">
                    <h2 className="text-4xl font-poppins font-bold text-berkeley">
                        {titleMain} <span className="text-jade">{titleHighlight}</span>
                    </h2>
                    <p className="mt-4 text-lg font-dm-sans text-gray-600">{description}</p>
                </div>

                <nav aria-label={t("interlinking.ariaLabel", { fallback: "Legături către paginile principale DaCars" })}>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {linksToRender.map((link) => (
                            <Link
                                key={`${link.href}-${link.label}`}
                                href={link.href ?? "/"}
                                className={cn(
                                    "group flex h-full flex-col justify-between rounded-3xl border bg-white p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                                    toneClassMap[link.tone ?? "primary"],
                                )}
                                aria-label={link.label}
                            >
                                <div>
                                    <p className="text-sm font-dm-sans uppercase tracking-wider text-berkeley/70">
                                        {t("interlinking.linkPrefix", { fallback: "Descoperă" })}
                                    </p>
                                    <h3 className="mt-2 text-xl font-poppins font-semibold">{link.label}</h3>
                                    {link.description && (
                                        <p className="mt-3 text-sm font-dm-sans text-gray-600">
                                            {link.description}
                                        </p>
                                    )}
                                </div>
                                <span className="mt-6 inline-flex items-center text-sm font-semibold">
                                    {t("interlinking.linkCta", { fallback: "Vezi detalii" })}
                                    <ArrowUpRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </nav>
            </div>
        </section>
    );
};

export default HomeInterlinkingSection;
