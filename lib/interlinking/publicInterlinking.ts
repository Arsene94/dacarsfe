import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { InterlinkingCopy, InterlinkingLink } from "@/types/interlinking";

export type SiteInterlinkingOptions = {
    excludeHrefs?: string[];
    includeLinks?: InterlinkingLink[];
    overrides?: Partial<Omit<InterlinkingCopy, "links" | "title">> & {
        title?: Partial<InterlinkingCopy["title"]>;
    };
};

const FALLBACK_LOCALE: Locale = DEFAULT_LOCALE;

const INTERLINKING_LINKS: InterlinkingLink[] = [
    {
        href: "/cars",
        label: "Flota de mașini DaCars",
        description: "Compară modele disponibile și verifică disponibilitatea în timp real pentru perioada dorită.",
        tone: "primary",
    },
    {
        href: "/offers",
        label: "Promoții și reduceri active",
        description: "Aplică vouchere, beneficii de loialitate și campanii sezoniere pentru a economisi imediat.",
        tone: "accent",
    },
    {
        href: "/faq",
        label: "Întrebări frecvente",
        description: "Clarifică depozitul, condițiile de preluare și politicile de plată înainte să confirmi rezervarea.",
        tone: "outline",
    },
    {
        href: "/contact",
        label: "Contactează un consultant 24/7",
        description: "Discută pe loc cu un specialist DaCars pentru recomandări personalizate și suport rapid.",
        tone: "secondary",
    },
    {
        href: "/blog",
        label: "Resurse și ghiduri DaCars",
        description: "Învață cum să optimizezi fiecare călătorie cu recomandările echipei noastre.",
        tone: "outline",
    },
];

const INTERLINKING_COPY: Record<Locale, InterlinkingCopy> = {
    ro: {
        title: {
            main: "Continuă explorarea DaCars",
            highlight: "cu pagini esențiale",
        },
        description:
            "Accesează rapid paginile cu cea mai mare autoritate internă și finalizează rezervarea având toate informațiile importante la îndemână.",
        ariaLabel: "Legături interne către paginile principale DaCars",
        linkPrefix: "Descoperă",
        linkCta: "Vezi detalii",
        links: INTERLINKING_LINKS,
    },
    en: {
        title: {
            main: "Keep exploring DaCars",
            highlight: "with essential pages",
        },
        description:
            "Jump straight to the destinations that concentrate our internal authority and keep your rental journey connected from start to finish.",
        ariaLabel: "Internal links to DaCars' key destinations",
        linkPrefix: "Discover",
        linkCta: "View details",
        links: [
            {
                href: "/cars",
                label: "Browse the DaCars fleet",
                description: "Compare available models and check real-time availability for your desired dates.",
                tone: "primary",
            },
            {
                href: "/offers",
                label: "Unlock current offers",
                description: "Apply vouchers, loyalty perks, and seasonal campaigns to secure the best rate.",
                tone: "accent",
            },
            {
                href: "/faq",
                label: "Visit the help centre",
                description: "Clarify deposits, pickup conditions, and payment policies before you confirm.",
                tone: "outline",
            },
            {
                href: "/contact",
                label: "Talk with a consultant 24/7",
                description: "Reach a DaCars specialist instantly for tailored recommendations and support.",
                tone: "secondary",
            },
            {
                href: "/blog",
                label: "Read DaCars guides",
                description: "Learn how to optimise every trip with fresh mobility advice from our team.",
                tone: "outline",
            },
        ],
    },
    it: {
        title: {
            main: "Continua a esplorare DaCars",
            highlight: "con le pagine chiave",
        },
        description:
            "Raggiungi subito le destinazioni con la massima autorevolezza interna e completa la prenotazione senza perdere informazioni importanti.",
        ariaLabel: "Collegamenti interni verso le principali pagine DaCars",
        linkPrefix: "Scopri",
        linkCta: "Vedi dettagli",
        links: [
            {
                href: "/cars",
                label: "Scopri la flotta DaCars",
                description: "Confronta i modelli disponibili e verifica la disponibilità in tempo reale per le tue date.",
                tone: "primary",
            },
            {
                href: "/offers",
                label: "Attiva le offerte correnti",
                description: "Utilizza voucher, vantaggi fedeltà e campagne stagionali per risparmiare subito.",
                tone: "accent",
            },
            {
                href: "/faq",
                label: "Consulta le FAQ",
                description: "Chiarisci deposito cauzionale, modalità di ritiro e politiche di pagamento prima di confermare.",
                tone: "outline",
            },
            {
                href: "/contact",
                label: "Parla con un consulente 24/7",
                description: "Confrontati con uno specialista DaCars per consigli personalizzati e supporto rapido.",
                tone: "secondary",
            },
            {
                href: "/blog",
                label: "Leggi le guide DaCars",
                description: "Scopri consigli di mobilità aggiornati per ottimizzare ogni viaggio.",
                tone: "outline",
            },
        ],
    },
    es: {
        title: {
            main: "Sigue explorando DaCars",
            highlight: "con páginas esenciales",
        },
        description:
            "Llega enseguida a los destinos con mayor autoridad interna y completa tu reserva con toda la información a mano.",
        ariaLabel: "Enlaces internos a las páginas principales de DaCars",
        linkPrefix: "Descubre",
        linkCta: "Ver detalles",
        links: [
            {
                href: "/cars",
                label: "Explora la flota DaCars",
                description: "Compara modelos disponibles y consulta la disponibilidad en tiempo real para tus fechas.",
                tone: "primary",
            },
            {
                href: "/offers",
                label: "Activa las ofertas vigentes",
                description: "Aplica cupones, ventajas de fidelidad y campañas estacionales para ahorrar al instante.",
                tone: "accent",
            },
            {
                href: "/faq",
                label: "Visita las preguntas frecuentes",
                description: "Aclara depósitos, condiciones de recogida y políticas de pago antes de confirmar.",
                tone: "outline",
            },
            {
                href: "/contact",
                label: "Habla con un asesor 24/7",
                description: "Contacta con un especialista DaCars para recibir recomendaciones personalizadas y soporte inmediato.",
                tone: "secondary",
            },
            {
                href: "/blog",
                label: "Lee las guías DaCars",
                description: "Aprende a optimizar cada viaje con los consejos de nuestro equipo.",
                tone: "outline",
            },
        ],
    },
    fr: {
        title: {
            main: "Poursuivez votre visite DaCars",
            highlight: "avec les pages essentielles",
        },
        description:
            "Accédez rapidement aux destinations qui concentrent notre autorité interne et finalisez votre réservation en toute sérénité.",
        ariaLabel: "Liens internes vers les pages principales de DaCars",
        linkPrefix: "Découvrir",
        linkCta: "Voir les détails",
        links: [
            {
                href: "/cars",
                label: "Parcourez la flotte DaCars",
                description: "Comparez les modèles disponibles et vérifiez la disponibilité en temps réel pour vos dates.",
                tone: "primary",
            },
            {
                href: "/offers",
                label: "Activez les offres en cours",
                description: "Appliquez bons, avantages fidélité et campagnes saisonnières pour obtenir le meilleur tarif.",
                tone: "accent",
            },
            {
                href: "/faq",
                label: "Consultez la FAQ",
                description: "Clarifiez dépôt, conditions de retrait et politiques de paiement avant de confirmer.",
                tone: "outline",
            },
            {
                href: "/contact",
                label: "Échangez avec un conseiller 24/7",
                description: "Contactez un spécialiste DaCars pour des recommandations personnalisées et un support rapide.",
                tone: "secondary",
            },
            {
                href: "/blog",
                label: "Lisez les guides DaCars",
                description: "Découvrez des conseils de mobilité actualisés pour optimiser chaque trajet.",
                tone: "outline",
            },
        ],
    },
    de: {
        title: {
            main: "Entdecke DaCars weiter",
            highlight: "mit den wichtigsten Seiten",
        },
        description:
            "Gelange direkt zu den Bereichen mit höchster interner Autorität und schließe deine Buchung mit allen relevanten Informationen ab.",
        ariaLabel: "Interne Links zu den wichtigsten DaCars-Seiten",
        linkPrefix: "Entdecke",
        linkCta: "Details ansehen",
        links: [
            {
                href: "/cars",
                label: "Unsere DaCars-Flotte",
                description: "Vergleiche verfügbare Modelle und prüfe die Echtzeit-Verfügbarkeit für deinen Zeitraum.",
                tone: "primary",
            },
            {
                href: "/offers",
                label: "Aktuelle Angebote aktivieren",
                description: "Nutze Gutscheine, Treuevorteile und saisonale Aktionen für sofortige Ersparnisse.",
                tone: "accent",
            },
            {
                href: "/faq",
                label: "Zum Hilfe-Center",
                description: "Klär Kaution, Abholbedingungen und Zahlungsrichtlinien, bevor du bestätigst.",
                tone: "outline",
            },
            {
                href: "/contact",
                label: "Sprich mit einem Berater (24/7)",
                description: "Wende dich an einen DaCars-Spezialisten für persönliche Empfehlungen und schnellen Support.",
                tone: "secondary",
            },
            {
                href: "/blog",
                label: "DaCars-Ratgeber lesen",
                description: "Erhalte aktuelle Mobilitäts-Tipps, um jede Reise zu optimieren.",
                tone: "outline",
            },
        ],
    },
};

export const getSiteInterlinkingCopy = (
    locale: Locale,
    options?: SiteInterlinkingOptions,
): InterlinkingCopy => {
    const base = INTERLINKING_COPY[locale] ?? INTERLINKING_COPY[FALLBACK_LOCALE];
    const exclude = new Set(
        (options?.excludeHrefs ?? []).map((href) => href.toLowerCase().trim()).filter((href) => href.length > 0),
    );

    const includedLinks = options?.includeLinks ?? [];
    const baseLinks = base.links.filter((link) => !exclude.has(link.href.toLowerCase()));

    const mergedLinksMap = new Map<string, InterlinkingLink>();
    const registerLink = (link: InterlinkingLink) => {
        if (!link.href || !link.label) {
            return;
        }
        const key = `${link.href.toLowerCase()}-${link.label.toLowerCase()}`;
        if (!mergedLinksMap.has(key)) {
            mergedLinksMap.set(key, link);
        }
    };

    baseLinks.forEach(registerLink);
    includedLinks.forEach(registerLink);

    const resolvedLinks = mergedLinksMap.size > 0 ? Array.from(mergedLinksMap.values()) : base.links;

    const resolvedTitle = {
        ...base.title,
        ...(options?.overrides?.title ?? {}),
    };

    return {
        ...base,
        ...options?.overrides,
        title: resolvedTitle,
        links: resolvedLinks,
    };
};
