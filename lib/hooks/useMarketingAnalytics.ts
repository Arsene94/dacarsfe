'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

import type {
    MarketingChannelApi,
    MarketingChannelPerformance,
    MarketingOverview,
    MarketingOverviewApi,
    MarketingRetentionPoint,
    MarketingRetentionPointApi,
    MarketingSourcesResponse,
} from '@/types/analytics-marketing';
import {
    createAnalyticsQuery,
    DEFAULT_ANALYTICS_FILTERS,
    type AnalyticsFilters,
} from '@/lib/analytics/filters';
import {API_BASE_URL} from "@/lib/api";

const jsonFetcher = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Nu am putut încărca datele de marketing.');
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
    const candidateKeys = [
        'id',
        'channel_id',
        'source_id',
        'uuid',
        'period_id',
        'label',
        'channel',
        'source',
    ];

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const collectChannelRecords = (
    ...sources: Array<MarketingSourcesResponse | Record<string, unknown> | null | undefined>
): MarketingChannelApi[] => {
    const collected: MarketingChannelApi[] = [];

    const appendRecords = (entries: unknown) => {
        if (!entries) {
            return;
        }

        if (Array.isArray(entries)) {
            entries.forEach((entry) => {
                if (entry && typeof entry === 'object') {
                    collected.push(entry as MarketingChannelApi);
                }
            });
            return;
        }

        if (typeof entries === 'object') {
            Object.values(entries).forEach((value) => {
                appendRecords(value);
            });
        }
    };

    sources.forEach((source) => {
        if (!source) {
            return;
        }

        if (Array.isArray(source)) {
            appendRecords(source);
            return;
        }

        if (isRecord(source)) {
            const candidateKeys = [
                'top_channels',
                'channels',
                'sources',
                'performance',
                'data',
                'items',
                'values',
                'list',
                'results',
            ];

            candidateKeys.forEach((key) => {
                if (key in source) {
                    appendRecords(source[key as keyof typeof source]);
                }
            });
        }
    });

    return collected;
};

const collectRetentionRecords = (
    ...sources: Array<MarketingSourcesResponse | Record<string, unknown> | null | undefined>
): MarketingRetentionPointApi[] => {
    const collected: MarketingRetentionPointApi[] = [];

    const appendRecords = (entries: unknown) => {
        if (!entries) {
            return;
        }

        if (Array.isArray(entries)) {
            entries.forEach((entry) => {
                if (entry && typeof entry === 'object') {
                    collected.push(entry as MarketingRetentionPointApi);
                }
            });
            return;
        }

        if (typeof entries === 'object') {
            Object.values(entries).forEach((value) => {
                appendRecords(value);
            });
        }
    };

    sources.forEach((source) => {
        if (!source) {
            return;
        }

        if (Array.isArray(source)) {
            appendRecords(source);
            return;
        }

        if (isRecord(source)) {
            const candidateKeys = [
                'retention_trends',
                'retention_trend',
                'retention_series',
                'retention',
                'retention_rate',
                'retentionRate',
                'series',
                'timeline',
                'periods',
                'data',
                'items',
            ];

            candidateKeys.forEach((key) => {
                if (key in source) {
                    appendRecords(source[key as keyof typeof source]);
                }
            });
        }
    });

    return collected;
};

const extractOverview = (
    payload?: MarketingOverviewApi | Record<string, unknown> | null,
): MarketingOverview | undefined => {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    const record = payload as MarketingOverviewApi;
    const recordAny = record as Record<string, unknown>;

    const totalCustomers =
        normalizeNumber(record.total_customers) ??
        normalizeNumber((recordAny.totalCustomers as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.total_clients as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.totalClients as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.clients as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.customers as number | string | undefined) ?? null) ??
        0;

    const retentionRate =
        normalizeNumber(record.retention_rate) ??
        normalizeNumber((recordAny.retentionRate as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.retention as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.retention_percent as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.retained_customers as number | string | undefined) ?? null) ??
        0;

    const averageLtv =
        normalizeNumber(record.average_LTV) ??
        normalizeNumber((recordAny.averageLTV as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.avg_ltv as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.ltv as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.lifetime_value as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.average_customer_value as number | string | undefined) ?? null) ??
        0;

    const averageRating =
        normalizeNumber(record.average_rating) ??
        normalizeNumber((recordAny.avg_rating as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.rating as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.satisfaction_score as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.nps as number | string | undefined) ?? null) ??
        normalizeNumber((recordAny.csat as number | string | undefined) ?? null) ??
        0;

    return {
        total_customers: totalCustomers,
        retention_rate: retentionRate,
        average_LTV: averageLtv,
        average_rating: averageRating,
    } satisfies MarketingOverview;
};

const extractChannels = (
    ...sources: Array<MarketingSourcesResponse | Record<string, unknown> | null | undefined>
): MarketingChannelPerformance[] => {
    const records = collectChannelRecords(...sources);

    const mapped = records.map((entry, index) => {
        const record = entry as Record<string, unknown>;

        const channelName =
            normalizeString(entry.channel) ??
            normalizeString(record.source) ??
            normalizeString(record.label) ??
            normalizeString(record.name) ??
            normalizeString(record.utm_source) ??
            normalizeString(record.utmSource) ??
            `Canal ${index + 1}`;

        const conversionRate =
            normalizeNumber(entry.conversion_rate) ??
            normalizeNumber(record.conversionRate) ??
            normalizeNumber(record.conversion) ??
            normalizeNumber(record.rate) ??
            normalizeNumber(record.retention_rate) ??
            0;

        const cpaValue =
            normalizeNumber(entry.CPA) ??
            normalizeNumber(record.cpa) ??
            normalizeNumber(record.cost_per_acquisition) ??
            normalizeNumber(record.cost) ??
            null;

        return {
            id: resolveIdentifier(record, index),
            channel: channelName,
            conversion_rate: conversionRate,
            CPA: typeof cpaValue === 'number' && Number.isFinite(cpaValue) ? cpaValue : null,
        } satisfies MarketingChannelPerformance;
    });

    const seen = new Map<number | string, MarketingChannelPerformance>();
    mapped.forEach((entry) => {
        if (!seen.has(entry.id)) {
            seen.set(entry.id, entry);
        }
    });

    return Array.from(seen.values());
};

const extractRetentionSeries = (
    ...sources: Array<MarketingSourcesResponse | Record<string, unknown> | null | undefined>
): MarketingRetentionPoint[] => {
    const records = collectRetentionRecords(...sources);

    const mapped = records.map((entry, index) => {
        const record = entry as Record<string, unknown>;
        const label =
            normalizeString(entry.label) ??
            normalizeString((record.date_label as string) ?? '') ??
            normalizeString((record.title as string) ?? '') ??
            normalizeString((record.name as string) ?? '') ??
            normalizeString((record.period_label as string) ?? '') ??
            normalizeString((record.period as string) ?? '') ??
            normalizeString((record.date as string) ?? '') ??
            `Perioada ${index + 1}`;

        const period =
            normalizeString((record.period as string) ?? '') ??
            normalizeString((record.date as string) ?? '') ??
            normalizeString((record.timestamp as string) ?? '') ??
            normalizeString((record.week as string) ?? '') ??
            normalizeString((record.month as string) ?? '') ??
            null;

        const retentionRate =
            normalizeNumber(entry.retention_rate) ??
            normalizeNumber((record.retentionRate as number) ?? '') ??
            normalizeNumber((record.retention as number) ?? '') ??
            normalizeNumber((record.value as number) ?? '') ??
            normalizeNumber((record.percentage as number) ?? '') ??
            normalizeNumber((record.rate as number) ?? '') ??
            0;

        return {
            id: resolveIdentifier(record, index),
            label: label ?? `Perioada ${index + 1}`,
            retention_rate: retentionRate,
            period,
        } satisfies MarketingRetentionPoint;
    });

    const seen = new Map<number | string, MarketingRetentionPoint>();
    mapped.forEach((entry) => {
        if (!seen.has(entry.id)) {
            seen.set(entry.id, entry);
        }
    });

    return Array.from(seen.values());
};

export type MarketingAnalyticsFilters = AnalyticsFilters;

const resolveFilters = (filters?: MarketingAnalyticsFilters): AnalyticsFilters => ({
    ...(filters ?? DEFAULT_ANALYTICS_FILTERS),
});

const buildKey = (endpoint: string, filters?: MarketingAnalyticsFilters): string | null => {
    const normalized = resolveFilters(filters);
    const query = createAnalyticsQuery(normalized);

    if (!query) {
        return null;
    }

    return `${endpoint}?${query}`;
};

export const useMarketingAnalytics = (filters?: MarketingAnalyticsFilters) => {
    const normalizedFilters = useMemo(() => resolveFilters(filters), [filters]);

    const overviewKey = useMemo(
        () => buildKey(API_BASE_URL + '/analytics/marketing/overview', normalizedFilters),
        [normalizedFilters],
    );

    const sourcesKey = useMemo(
        () => buildKey(API_BASE_URL + '/analytics/marketing/sources', normalizedFilters),
        [normalizedFilters],
    );

    const {
        data: overviewResponse,
        error: overviewError,
        isValidating: overviewValidating,
        mutate: mutateOverview,
    } = useSWR<MarketingOverviewApi & Record<string, unknown>>(overviewKey, jsonFetcher, {
        revalidateOnFocus: false,
    });

    const {
        data: sourcesResponse,
        error: sourcesError,
        isValidating: sourcesValidating,
        mutate: mutateSources,
    } = useSWR<MarketingSourcesResponse & Record<string, unknown>>(sourcesKey, jsonFetcher, {
        revalidateOnFocus: false,
    });

    const overview = useMemo(
        () => extractOverview(overviewResponse ?? (sourcesResponse as MarketingOverviewApi)),
        [overviewResponse, sourcesResponse],
    );

    const channels = useMemo(
        () => extractChannels(sourcesResponse, overviewResponse),
        [sourcesResponse, overviewResponse],
    );

    const retentionSeries = useMemo(
        () => extractRetentionSeries(sourcesResponse, overviewResponse),
        [sourcesResponse, overviewResponse],
    );

    const refresh = useCallback(async () => {
        const tasks: Array<Promise<unknown>> = [];

        if (overviewKey) {
            tasks.push(mutateOverview());
        }

        if (sourcesKey) {
            tasks.push(mutateSources());
        }

        await Promise.all(tasks);
    }, [mutateOverview, mutateSources, overviewKey, sourcesKey]);

    const isLoading =
        Boolean(overviewKey && typeof overviewResponse === 'undefined' && !overviewError) ||
        Boolean(sourcesKey && typeof sourcesResponse === 'undefined' && !sourcesError);

    const isRefreshing = Boolean(overviewKey && overviewValidating) || Boolean(sourcesKey && sourcesValidating);
    const isError = Boolean((overviewKey && overviewError) || (sourcesKey && sourcesError));

    return {
        overview,
        channels,
        retentionSeries,
        isLoading,
        isRefreshing,
        isError,
        refresh,
    };
};

export default useMarketingAnalytics;
