import type { UnknownRecord } from "@/types/api";

export type OfferStatus = "draft" | "scheduled" | "published" | "archived" | (string & {});

export type OfferIcon = "heart" | "users" | "gift" | "calendar" | (string & {});

export type OfferBenefitType =
    | "percentage_discount"
    | "fixed_discount"
    | "free_days"
    | "deposit_waiver"
    | "extra_driver"
    | "airport_transfer"
    | "custom"
    | (string & {});

export interface OfferBenefit extends UnknownRecord {
    type: OfferBenefitType;
    value?: string | number | null;
}

export interface Offer extends UnknownRecord {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    discount_label?: string | null;
    badge?: string | null;
    features?: string[] | null;
    benefits?: OfferBenefit[] | null;
    icon?: OfferIcon | null;
    background_class?: string | null;
    text_class?: string | null;
    primary_cta_label?: string | null;
    primary_cta_url?: string | null;
    status?: OfferStatus | null;
    starts_at?: string | null;
    ends_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export type OfferPayload = Partial<{
    title: string;
    slug: string;
    description: string | null;
    discount_label: string | null;
    badge: string | null;
    features: string[] | string | null;
    benefits: OfferBenefit[] | null;
    icon: OfferIcon | null;
    background_class: string | null;
    text_class: string | null;
    primary_cta_label: string | null;
    primary_cta_url: string | null;
    status: OfferStatus | null;
    starts_at: string | null;
    ends_at: string | null;
}> &
    Record<string, unknown>;

export interface OfferListParams {
    page?: number;
    perPage?: number;
    limit?: number;
    status?: OfferStatus | string;
    search?: string;
    include?: string | readonly string[];
    audience?: "admin" | "public" | (string & {});
    sort?: string;
    language?: string | null;
}
