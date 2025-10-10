export type FaqStatus = "published" | "pending" | "unavailable";

export interface FaqCategorySummary {
    id: number;
    name: string;
    description?: string | null;
    order?: number | null;
    status?: FaqStatus | null;
}

export interface FaqCategory extends FaqCategorySummary {
    created_at?: string | null;
    updated_at?: string | null;
    faqs?: Faq[];
    translations?: FaqCategoryTranslation[];
}

export interface FaqCategoryTranslation {
    lang?: string;
    name?: string;
    description?: string | null;
}

export interface FaqCategoryTranslationPayload {
    name?: string;
    description?: string | null;
}

export interface Faq {
    id: number;
    category_id: number;
    question: string;
    answer: string;
    status?: FaqStatus | null;
    created_at?: string | null;
    updated_at?: string | null;
    category?: FaqCategorySummary | null;
    translations?: FaqTranslation[];
}

export interface FaqTranslation {
    lang?: string;
    question?: string;
    answer?: string;
}

export interface FaqTranslationPayload {
    question?: string;
    answer?: string;
}

export interface FaqCategoryPayload {
    name: string;
    description?: string | null;
    order?: number | null;
    status?: FaqStatus;
}

export interface FaqPayload {
    question: string;
    answer: string;
    category_id: number;
    status?: FaqStatus;
}

export interface FaqCategoryListParams {
    page?: number;
    perPage?: number;
    per_page?: number;
    limit?: number;
    status?: string;
    order?: string;
    name_like?: string;
    include?: string | readonly string[];
}

export interface FaqListParams {
    page?: number;
    perPage?: number;
    per_page?: number;
    limit?: number;
    status?: string;
    category_id?: number | string;
    question_like?: string;
    include?: string | readonly string[];
}
