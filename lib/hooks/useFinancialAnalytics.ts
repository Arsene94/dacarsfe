'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

import type {
    FinancialCarApi,
    FinancialCarRanking,
    FinancialCategoriesResponse,
    FinancialCategory,
    FinancialCategoryApi,
    FinancialSummary,
    FinancialSummaryApi,
} from '@/types/analytics-financial';

const jsonFetcher = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error('Nu am putut încărca datele financiare.');
    }

    return (await response.json()) as T;
};

const normalizeString = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed;
        }
    }

    return null;
};

const normalizeNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return null;
        }

        const withoutSpaces = trimmed.replace(/[\s\u00A0\u202F]+/g, '');
        const hasComma = withoutSpaces.includes(',');
        const hasDot = withoutSpaces.includes('.');

        let normalized = withoutSpaces;
        if (hasComma && hasDot) {
            normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
        } else if (hasComma) {
            normalized = normalized.replace(/,/g, '.');
        }

        const sanitized = normalized.replace(/[^0-9.-]/g, '');
        const parsed = Number.parseFloat(sanitized);

        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
};

const resolveIdentifier = (record: Record<string, unknown>, fallback: number): number | string => {
    const candidateKeys = ['id', 'category_id', 'car_id', 'vehicle_id', 'uuid'];

    for (const key of candidateKeys) {
        if (key in record) {
            const value = record[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            const normalized = normalizeString(value);
            if (normalized) {
                return normalized;
            }
        }
    }

    return fallback;
};

const extractSummary = (
    payload?: FinancialSummary | (FinancialSummaryApi & Record<string, unknown>) | null,
): FinancialSummary | undefined => {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    const totalRevenue =
        normalizeNumber((payload as FinancialSummary).total_revenue) ??
        normalizeNumber((payload as FinancialSummaryApi).total_revenue) ??
        0;
    const totalExpenses =
        normalizeNumber((payload as FinancialSummary).total_expenses) ??
        normalizeNumber((payload as FinancialSummaryApi).total_expenses) ??
        0;
    const netProfit =
        normalizeNumber((payload as FinancialSummary).net_profit) ??
        normalizeNumber((payload as FinancialSummaryApi).net_profit) ??
        0;

    const roiValue =
        normalizeNumber((payload as FinancialSummary).ROI) ??
        normalizeNumber((payload as FinancialSummaryApi).ROI) ??
        normalizeNumber((payload as FinancialSummaryApi).roi) ??
        (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0);

    return {
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        ROI: roiValue ?? 0,
    } satisfies FinancialSummary;
};

const gatherCategoryRecords = (
    payload: FinancialCategoriesResponse | (Record<string, unknown> & FinancialSummaryApi) | null | undefined,
): FinancialCategoryApi[] => {
    if (!payload) {
        return [];
    }

    if (Array.isArray(payload)) {
        return payload.filter((entry): entry is FinancialCategoryApi => Boolean(entry && typeof entry === 'object'));
    }

    if (typeof payload !== 'object') {
        return [];
    }

    const record = payload as Record<string, unknown>;
    const candidateKeys = ['categories', 'category_breakdown', 'breakdown', 'items', 'data'];

    const entries: FinancialCategoryApi[] = [];
    for (const key of candidateKeys) {
        const value = record[key];
        if (Array.isArray(value)) {
            for (const entry of value) {
                if (entry && typeof entry === 'object') {
                    entries.push(entry as FinancialCategoryApi);
                }
            }
        }
    }

    return entries;
};

const gatherCarRecords = (
    payload: FinancialCategoriesResponse | (Record<string, unknown> & FinancialSummaryApi) | null | undefined,
): FinancialCarApi[] => {
    if (!payload) {
        return [];
    }

    if (Array.isArray(payload)) {
        return payload.filter((entry): entry is FinancialCarApi => Boolean(entry && typeof entry === 'object'));
    }

    if (typeof payload !== 'object') {
        return [];
    }

    const record = payload as Record<string, unknown>;
    const candidateKeys = ['cars', 'top_cars', 'vehicles', 'rankings'];

    const entries: FinancialCarApi[] = [];
    for (const key of candidateKeys) {
        const value = record[key];
        if (Array.isArray(value)) {
            for (const entry of value) {
                if (entry && typeof entry === 'object') {
                    entries.push(entry as FinancialCarApi);
                }
            }
        }
    }

    return entries;
};

const extractCategories = (
    ...payloads: (
        | FinancialCategoriesResponse
        | (Record<string, unknown> & FinancialSummaryApi)
        | null
        | undefined
    )[]
): FinancialCategory[] => {
    const aggregated: FinancialCategory[] = [];

    payloads.forEach((payload) => {
        const records = gatherCategoryRecords(payload);
        records.forEach((entry, index) => {
            const record = (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}) ?? {};
            const name =
                normalizeString(record.category) ||
                normalizeString(record.name) ||
                normalizeString(record.label) ||
                `Categorie ${aggregated.length + index + 1}`;

            const revenue =
                normalizeNumber(record.revenue) ??
                normalizeNumber(record.total_revenue) ??
                normalizeNumber(record.net_revenue) ??
                0;

            const profit =
                normalizeNumber(record.profit) ??
                normalizeNumber(record.total_profit) ??
                normalizeNumber(record.net_profit) ??
                0;

            const id = resolveIdentifier(record, aggregated.length + index);

            aggregated.push({
                id,
                name,
                revenue: revenue ?? 0,
                profit: profit ?? 0,
            });
        });
    });

    const deduplicated = new Map<FinancialCategory['id'], FinancialCategory>();
    aggregated.forEach((item) => {
        if (!deduplicated.has(item.id)) {
            deduplicated.set(item.id, item);
        }
    });

    return Array.from(deduplicated.values());
};

const extractCarRanking = (
    ...payloads: (
        | FinancialCategoriesResponse
        | (Record<string, unknown> & FinancialSummaryApi)
        | null
        | undefined
    )[]
): FinancialCarRanking[] => {
    const aggregated: FinancialCarRanking[] = [];

    payloads.forEach((payload) => {
        const records = gatherCarRecords(payload);
        records.forEach((entry, index) => {
            const record = (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}) ?? {};
            const name =
                normalizeString(record.name) ||
                normalizeString(record.car_name) ||
                normalizeString(record.model) ||
                normalizeString(record.plate) ||
                `Vehicul ${aggregated.length + index + 1}`;

            const revenue =
                normalizeNumber(record.revenue) ??
                normalizeNumber(record.total_revenue) ??
                normalizeNumber(record.net_revenue) ??
                0;
            const profit =
                normalizeNumber(record.profit) ??
                normalizeNumber(record.margin) ??
                normalizeNumber(record.total_profit) ??
                normalizeNumber(record.net_profit) ??
                0;

            const providedRoi =
                normalizeNumber(record.roi) ?? normalizeNumber(record.ROI) ?? null;
            const computedRoi = revenue && revenue !== 0 ? (profit / revenue) * 100 : 0;

            const roi = providedRoi ?? computedRoi ?? 0;
            const id = resolveIdentifier(record, aggregated.length + index);

            aggregated.push({
                id,
                name,
                revenue: revenue ?? 0,
                profit: profit ?? 0,
                roi,
            });
        });
    });

    const deduplicated = new Map<FinancialCarRanking['id'], FinancialCarRanking>();
    aggregated.forEach((item) => {
        const existing = deduplicated.get(item.id);
        if (!existing) {
            deduplicated.set(item.id, item);
            return;
        }

        deduplicated.set(item.id, {
            ...existing,
            revenue: existing.revenue || item.revenue ? Math.max(existing.revenue, item.revenue) : item.revenue,
            profit: existing.profit || item.profit ? Math.max(existing.profit, item.profit) : item.profit,
            roi: existing.roi || item.roi ? Math.max(existing.roi, item.roi) : item.roi,
        });
    });

    return Array.from(deduplicated.values()).sort((a, b) => b.profit - a.profit);
};

export type UseFinancialAnalyticsResult = {
    summary?: FinancialSummary;
    categories: FinancialCategory[];
    carRanking: FinancialCarRanking[];
    isLoading: boolean;
    isRefreshing: boolean;
    isError: boolean;
    refresh: () => Promise<void>;
};

export const useFinancialAnalytics = (): UseFinancialAnalyticsResult => {
    const {
        data: summaryResponse,
        error: summaryError,
        isValidating: summaryValidating,
        mutate: mutateSummary,
    } = useSWR<FinancialSummaryApi & Record<string, unknown>>(
        '/api/analytics/financial/summary',
        jsonFetcher,
        {
            revalidateOnFocus: false,
        },
    );

    const {
        data: categoriesResponse,
        error: categoriesError,
        isValidating: categoriesValidating,
        mutate: mutateCategories,
    } = useSWR<FinancialCategoriesResponse & (FinancialSummaryApi & Record<string, unknown>)>(
        '/api/analytics/financial/categories',
        jsonFetcher,
        {
            revalidateOnFocus: false,
        },
    );

    const summary = useMemo(() => extractSummary(summaryResponse), [summaryResponse]);

    const categories = useMemo(
        () => extractCategories(categoriesResponse, summaryResponse),
        [categoriesResponse, summaryResponse],
    );

    const carRanking = useMemo(
        () => extractCarRanking(categoriesResponse, summaryResponse),
        [categoriesResponse, summaryResponse],
    );

    const refresh = useCallback(async () => {
        await Promise.all([mutateSummary(), mutateCategories()]);
    }, [mutateSummary, mutateCategories]);

    const isLoading =
        (typeof summaryResponse === 'undefined' && !summaryError) ||
        (typeof categoriesResponse === 'undefined' && !categoriesError);

    const isRefreshing = summaryValidating || categoriesValidating;
    const isError = Boolean(summaryError || categoriesError);

    return {
        summary,
        categories,
        carRanking,
        isLoading,
        isRefreshing,
        isError,
        refresh,
    };
};

export default useFinancialAnalytics;
