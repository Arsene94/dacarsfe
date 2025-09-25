import type { OfferKind } from "@/types/offer";

export type OfferTypeOption = {
    value: OfferKind;
    label: string;
    description: string;
    requiresValue: boolean;
    valuePlaceholder?: string;
    formatBadge: (value?: string | null) => string;
};

const trimValue = (value?: string | null): string => (value ?? "").trim();

const stripLeadingPlus = (value: string): string => value.replace(/^\+/, "");

const ensurePrefix = (value: string, prefix: string): string =>
    value.startsWith(prefix) ? value : `${prefix}${value}`;

const ensureSuffix = (value: string, suffix: string): string =>
    value.endsWith(suffix) ? value : `${value}${suffix}`;

export const OFFER_TYPE_OPTIONS: OfferTypeOption[] = [
    {
        value: "percentage_discount",
        label: "Reducere procentuală",
        description: "Aplică un procent din tariful de bază al rezervării.",
        requiresValue: true,
        valuePlaceholder: "20",
        formatBadge: (rawValue) => {
            const trimmed = stripLeadingPlus(trimValue(rawValue));
            if (!trimmed) {
                return "Reducere procentuală";
            }
            const withoutPercent = trimmed.replace(/%/g, "");
            const withPercent = ensureSuffix(withoutPercent, "%");
            const normalized = ensurePrefix(withPercent, "-");
            return `${normalized} reducere`;
        },
    },
    {
        value: "fixed_discount",
        label: "Reducere valorică",
        description: "Scade o sumă fixă (lei sau euro) din total.",
        requiresValue: true,
        valuePlaceholder: "50 lei",
        formatBadge: (rawValue) => {
            const trimmed = stripLeadingPlus(trimValue(rawValue));
            if (!trimmed) {
                return "Reducere valorică";
            }
            const normalized = ensurePrefix(trimmed, "-");
            return `${normalized} reducere`;
        },
    },
    {
        value: "free_day_bonus",
        label: "Zile gratuite",
        description: "Oferă zile suplimentare fără cost pentru aceeași rezervare.",
        requiresValue: true,
        valuePlaceholder: "1 zi",
        formatBadge: (rawValue) => {
            const trimmed = trimValue(rawValue).replace(/^[-+]/, "");
            if (!trimmed) {
                return "Zile gratuite incluse";
            }
            return `+${trimmed} zile gratuite`;
        },
    },
    {
        value: "free_service_upgrade",
        label: "Upgrade gratuit",
        description: "Include un serviciu sau un upgrade fără cost suplimentar.",
        requiresValue: false,
        valuePlaceholder: "Asigurare completă",
        formatBadge: (rawValue) => {
            const trimmed = trimValue(rawValue);
            if (!trimmed) {
                return "Upgrade gratuit inclus";
            }
            return `${trimmed} gratuit`;
        },
    },
    {
        value: "deposit_waiver",
        label: "Fără depozit",
        description: "Elimină garanția sau depozitul standard.",
        requiresValue: false,
        formatBadge: () => "Fără depozit",
    },
];

export const getOfferTypeOption = (type?: OfferKind | null) =>
    OFFER_TYPE_OPTIONS.find((option) => option.value === type);

export const formatOfferBadge = (type?: OfferKind | null, value?: string | null): string | null => {
    if (!type) {
        return null;
    }
    const option = getOfferTypeOption(type);
    if (!option) {
        return null;
    }
    const trimmed = trimValue(value);
    if (option.requiresValue && trimmed.length === 0) {
        return null;
    }
    return option.formatBadge(trimmed);
};
