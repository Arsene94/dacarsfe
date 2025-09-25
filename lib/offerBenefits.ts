import type { OfferBenefit, OfferBenefitType } from "@/types/offer";

export interface OfferBenefitDefinition {
    type: OfferBenefitType;
    label: string;
    description: string;
    requiresValue: boolean;
    valueLabel?: string;
    valuePlaceholder?: string;
    valueHelper?: string;
}

export const offerBenefitDefinitions: OfferBenefitDefinition[] = [
    {
        type: "percentage_discount",
        label: "Reducere procentuală",
        description:
            "Aplică un procent din tariful de bază. Formula recomandată: preț_final = preț_bază - (preț_bază * procent / 100).",
        requiresValue: true,
        valueLabel: "Procent reducere",
        valuePlaceholder: "20%",
        valueHelper: "Acceptă valori procentuale, inclusiv simbolul %.",
    },
    {
        type: "fixed_discount",
        label: "Reducere valorică",
        description:
            "Scade o sumă fixă din tarif. Formula recomandată: preț_final = preț_bază - valoare_fixă (nu coborî sub 0).",
        requiresValue: true,
        valueLabel: "Valoare reducere",
        valuePlaceholder: "150 lei",
        valueHelper: "Folosește valuta afișată în checkout (ex: lei, euro).",
    },
    {
        type: "free_days",
        label: "Zile gratuite",
        description:
            "Adaugă zile fără cost. Recomandare: calculează tariful zilnic mediu și scade-l pentru fiecare zi gratuită.",
        requiresValue: true,
        valueLabel: "Număr zile",
        valuePlaceholder: "1",
        valueHelper: "Introduce numărul de zile acordate fără cost suplimentar.",
    },
    {
        type: "deposit_waiver",
        label: "Garanție eliminată",
        description:
            "Elimină sau reduce depozitul standard. În implementare setează depozitul la 0 sau la valoarea specificată.",
        requiresValue: false,
        valueHelper: "Completează valoarea doar dacă garanția scade la o sumă specifică.",
    },
    {
        type: "extra_driver",
        label: "Șofer adițional inclus",
        description:
            "Include costul pentru șofer suplimentar. În backend marchează serviciul 'driver extra' ca fiind gratuit.",
        requiresValue: false,
    },
    {
        type: "airport_transfer",
        label: "Transfer aeroport inclus",
        description:
            "Include transferul aeroport-hotel. În implementare marchează serviciul de transfer ca inclus în prețul ofertei.",
        requiresValue: false,
    },
    {
        type: "custom",
        label: "Text personalizat",
        description:
            "Pentru beneficii atipice. Textul introdus devine mesajul afișat clienților în listă.",
        requiresValue: true,
        valueLabel: "Mesaj personalizat",
        valuePlaceholder: "Asigurare completă cadou",
    },
];

const definitionMap: Record<OfferBenefitType, OfferBenefitDefinition> = offerBenefitDefinitions.reduce(
    (acc, definition) => {
        acc[definition.type] = definition;
        return acc;
    },
    {} as Record<OfferBenefitType, OfferBenefitDefinition>,
);

const normalizeBenefitValue = (value: OfferBenefit["value"]): string | null => {
    if (value == null) {
        return null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return null;
};

const sanitizeBenefitType = (value: string): OfferBenefitType =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_") as OfferBenefitType;

export const parseOfferBenefitType = (value: unknown): OfferBenefitType | undefined => {
    if (value == null) {
        return undefined;
    }

    if (typeof value === "string") {
        const normalized = sanitizeBenefitType(value);
        if (definitionMap[normalized]) {
            return normalized;
        }
        return undefined;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        const normalized = sanitizeBenefitType(String(value));
        if (definitionMap[normalized]) {
            return normalized;
        }
    }

    return undefined;
};

export const parseOfferBenefitValue = (value: unknown): string | number | null => {
    if (value == null) {
        return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    return null;
};

const parseBenefitEntry = (entry: unknown): OfferBenefit | null => {
    if (entry == null) {
        return null;
    }

    if (typeof entry === "string" || typeof entry === "number") {
        const normalizedValue = parseOfferBenefitValue(entry);
        if (normalizedValue == null) {
            return null;
        }
        return {
            type: "custom",
            value: normalizedValue,
        };
    }

    if (typeof entry === "object") {
        const source = entry as Record<string, unknown>;
        const benefitType =
            parseOfferBenefitType(source.type) ??
            parseOfferBenefitType((source as { benefit_type?: unknown }).benefit_type) ??
            parseOfferBenefitType((source as { slug?: unknown }).slug) ??
            parseOfferBenefitType((source as { key?: unknown }).key);
        const valueCandidate =
            source.value ??
            (source as { amount?: unknown }).amount ??
            (source as { label?: unknown }).label ??
            (source as { text?: unknown }).text ??
            (source as { name?: unknown }).name;
        const benefitValue = parseOfferBenefitValue(valueCandidate);

        if (benefitType) {
            return {
                type: benefitType,
                value: benefitValue ?? undefined,
            };
        }

        if (benefitValue != null) {
            return {
                type: "custom",
                value: benefitValue,
            };
        }
    }

    return null;
};

export const parseOfferBenefits = (value: unknown): OfferBenefit[] => {
    if (Array.isArray(value)) {
        return value
            .map((entry) => parseBenefitEntry(entry))
            .filter((entry): entry is OfferBenefit => entry !== null);
    }

    if (typeof value === "object" && value !== null) {
        const parsed = parseBenefitEntry(value);
        return parsed ? [parsed] : [];
    }

    if (typeof value === "string" || typeof value === "number") {
        const parsed = parseBenefitEntry(value);
        return parsed ? [parsed] : [];
    }

    return [];
};

export const normalizeOfferBenefits = (raw: unknown, fallback: string[] = []): OfferBenefit[] => {
    const parsed = parseOfferBenefits(raw);
    if (parsed.length > 0) {
        return parsed;
    }

    return fallback
        .map((entry) => {
            if (entry == null) {
                return null;
            }
            const value = normalizeBenefitValue(entry);
            if (!value) {
                return null;
            }
            return {
                type: "custom",
                value,
            } satisfies OfferBenefit;
        })
        .filter((benefit): benefit is OfferBenefit => benefit !== null);
};

export const formatOfferBenefitTitle = (benefit: OfferBenefit): string => {
    if (!benefit || !benefit.type) {
        return "";
    }

    const definition = definitionMap[benefit.type];
    const value = normalizeBenefitValue(benefit.value);

    if (!definition) {
        return value ?? "";
    }

    if (benefit.type === "custom") {
        return value ?? definition.label;
    }

    if (value) {
        return `${value} ${definition.label}`;
    }

    return definition.label;
};

export const getOfferBenefitDefinition = (type: OfferBenefitType | undefined): OfferBenefitDefinition | undefined => {
    if (!type) {
        return undefined;
    }
    return definitionMap[type];
};
