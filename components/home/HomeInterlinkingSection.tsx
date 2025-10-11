"use client";

import { useTranslations } from "@/lib/i18n/useTranslations";
import InterlinkingSection, {
    type InterlinkingCopy,
    type InterlinkingLink,
} from "@/components/interlinking/InterlinkingSection";

type InterlinkingMessages = {
    title?: { main?: string; highlight?: string };
    description?: string;
    ariaLabel?: string;
    linkPrefix?: string;
    linkCta?: string;
    links?: Array<Partial<InterlinkingLink>>;
};

const FALLBACK_COPY: InterlinkingCopy = {
    title: {
        main: "Continuă explorarea DaCars",
        highlight: "cu pagini esențiale",
    },
    description:
        "Accesează rapid cele mai vizitate pagini și finalizează rezervarea fără să pierzi informații importante.",
    ariaLabel: "Legături către paginile principale DaCars",
    linkPrefix: "Descoperă",
    linkCta: "Vezi detalii",
    links: [
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
    ],
};

const HomeInterlinkingSection = () => {
    const { messages, t } = useTranslations("home");
    const interlinking = (messages.interlinking ?? {}) as InterlinkingMessages;

    const titleMain = interlinking.title?.main ?? t("interlinking.title.main", {
        fallback: FALLBACK_COPY.title.main,
    });
    const titleHighlight = interlinking.title?.highlight ?? t("interlinking.title.highlight", {
        fallback: FALLBACK_COPY.title.highlight,
    });
    const description = interlinking.description ??
        t("interlinking.description", { fallback: FALLBACK_COPY.description });
    const ariaLabel = interlinking.ariaLabel ??
        t("interlinking.ariaLabel", { fallback: FALLBACK_COPY.ariaLabel });
    const linkPrefix = interlinking.linkPrefix ??
        t("interlinking.linkPrefix", { fallback: FALLBACK_COPY.linkPrefix });
    const linkCta = interlinking.linkCta ??
        t("interlinking.linkCta", { fallback: FALLBACK_COPY.linkCta });

    const resolvedLinks = (Array.isArray(interlinking.links) ? interlinking.links : FALLBACK_COPY.links)
        .map((link) => {
            const fallback = FALLBACK_COPY.links.find((item) => item.label === link.label);
            const href = (link.href ?? fallback?.href ?? "/").trim();
            const label = (link.label ?? fallback?.label ?? "").trim();
            const descriptionRaw = link.description ?? fallback?.description ?? "";
            const description = descriptionRaw.trim();
            const tone = link.tone ?? fallback?.tone ?? "primary";

            const normalized: InterlinkingLink = { href, label, tone };

            if (description.length > 0) {
                normalized.description = description;
            }

            return normalized;
        })
        .filter((link) => link.href.length > 0 && link.label.length > 0);

    const copy: InterlinkingCopy = {
        title: { main: titleMain, highlight: titleHighlight },
        description,
        ariaLabel,
        linkPrefix,
        linkCta,
        links: resolvedLinks.length > 0 ? resolvedLinks : FALLBACK_COPY.links,
    };

    return <InterlinkingSection copy={copy} />;
};

export default HomeInterlinkingSection;
