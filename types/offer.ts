import type { UnknownRecord } from "@/types/api";

export type OfferStatus = "draft" | "scheduled" | "published" | "archived" | (string & {});

export type OfferKind =
    | "percentage_discount"
    | "fixed_discount"
    | "free_day_bonus"
    | "free_service_upgrade"
    | "deposit_waiver"
    | (string & {});

export type OfferIcon = "heart" | "users" | "gift" | "calendar" | (string & {});

export interface Offer extends UnknownRecord {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    discount_label?: string | null;
    badge?: string | null;
    offer_type?: OfferKind | null;
    offer_value?: string | null;
    features?: string[] | null;
    benefits?: string[] | null;
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
    offer_type: OfferKind | null;
    offer_value: string | null;
    features: string[] | string | null;
    benefits: string[] | string | null;
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
