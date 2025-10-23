'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

import type {
    OperationalMaintenanceTrend,
    OperationalOverview,
    OperationalTopCar,
    OperationalTopResponse,
} from '@/types/analytics-operational';
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
    });

    if (!response.ok) {
        throw new Error('Nu am putut încărca datele operaționale.');
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
        'car_id',
        'vehicle_id',
        'uuid',
        'license_plate',
        'car_license_plate',
        'plate',
        'registration',
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

const fallbackContainerKeys = [
    'data',
    'items',
    'results',
    'list',
    'entries',
    'values',
    'payload',
    'response',
    'records',
    'series',
    'points',
    'datasets',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const collectRecords = (
    candidateKeys: string[],
    isEntry: (record: Record<string, unknown>) => boolean,
    ...sources: unknown[]
): Record<string, unknown>[] => {
    const queue: unknown[] = [];
    const visited = new Set<unknown>();
    const collected: Record<string, unknown>[] = [];
    const inspectionKeys = Array.from(new Set([...candidateKeys, ...fallbackContainerKeys]));

    sources.forEach((source) => {
        if (!source) {
            return;
        }

        if (Array.isArray(source) || isRecord(source)) {
            queue.push(source);
        }
    });

    while (queue.length > 0) {
        const current = queue.shift();

        if (!current || typeof current !== 'object') {
            continue;
        }

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);

        if (Array.isArray(current)) {
            current.forEach((item) => {
                if (!item || typeof item !== 'object') {
                    return;
                }

                if (isRecord(item) && isEntry(item)) {
                    collected.push(item);
                }

                queue.push(item);
            });

            continue;
        }

        const record = current as Record<string, unknown>;

        if (isEntry(record)) {
            collected.push(record);
        }

        inspectionKeys.forEach((key) => {
            if (!(key in record)) {
                return;
            }

            const value = record[key];

            if (!value || typeof value !== 'object') {
                return;
            }

            queue.push(value);
        });
    }

    return collected;
};

const buildAnalyticsUrl = (endpoint: string, filters: AnalyticsFilters): string | null => {
    const query = createAnalyticsQuery(filters);

    if (!query) {
        return null;
    }

    return `${endpoint}?${query}`;
};

const extractTopCars = (
    ...sources: (
        | OperationalTopResponse
        | OperationalOverview
        | Record<string, unknown>
        | null
        | undefined
    )[]
): OperationalTopCar[] => {
    const candidateKeys = [
        'top_cars',
        'topCars',
        'cars',
        'vehicles',
        'top_vehicles',
        'topVehicles',
        'leaderboard',
        'top',
        'rankings',
        'top10',
        'profit_leaders',
    ];

    const topEntries = collectRecords(
        candidateKeys,
        (record) => {
            const profitLikeKeys = [
                'profit',
                'total_profit',
                'net_profit',
                'netProfit',
                'value',
                'amount',
                'revenue',
            ];

            return profitLikeKeys.some((key) => normalizeNumber(record[key]) !== null);
        },
        ...sources,
    );

    const ranked = new Map<string, OperationalTopCar>();

    topEntries.forEach((record, index) => {
        const licensePlate =
            normalizeString(record.license_plate) ||
            normalizeString(record.car_license_plate) ||
            normalizeString(record.registration) ||
            normalizeString(record.plate) ||
            null;

        const carName =
            normalizeString(record.name) ||
            normalizeString(record.car_name) ||
            normalizeString(record.model) ||
            null;

        const label = licensePlate ?? carName ?? `Mașină ${index + 1}`;

        const profit =
            normalizeNumber(record.profit) ??
            normalizeNumber(record.total_profit) ??
            normalizeNumber(record.net_profit) ??
            normalizeNumber(record.netProfit) ??
            normalizeNumber(record.value) ??
            normalizeNumber(record.amount) ??
            normalizeNumber(record.revenue) ??
            0;

        const id = resolveIdentifier(record, index);
        const key = typeof id === 'number' ? `number:${id}` : `string:${id}`;
        const candidate: OperationalTopCar = {
            id,
            licensePlate: label,
            carName,
            profit,
        };

        const existing = ranked.get(key);
        if (!existing || existing.profit < candidate.profit) {
            ranked.set(key, candidate);
        }
    });

    return Array.from(ranked.values())
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
};

const extractMaintenanceTrends = (
    ...sources: (
        | OperationalTopResponse
        | OperationalOverview
        | Record<string, unknown>
        | null
        | undefined
    )[]
): OperationalMaintenanceTrend[] => {
    const candidateKeys = [
        'maintenance_trends',
        'maintenanceTrends',
        'trends',
        'maintenance',
        'maintenance_costs',
        'cost_trends',
        'timeline',
        'series',
        'history',
    ];

    const trendEntries = collectRecords(
        candidateKeys,
        (record) => {
            const labelCandidate =
                normalizeString(record.label) ||
                normalizeString(record.period) ||
                normalizeString(record.date) ||
                normalizeString(record.month);

            if (!labelCandidate) {
                return false;
            }

            const costLikeKeys = ['cost', 'value', 'amount', 'total_cost', 'expense'];

            return costLikeKeys.some((key) => normalizeNumber(record[key]) !== null);
        },
        ...sources,
    );

    const timeline: OperationalMaintenanceTrend[] = [];
    const seen = new Map<string, OperationalMaintenanceTrend>();

    trendEntries.forEach((record) => {
        const label =
            normalizeString(record.label) ||
            normalizeString(record.period) ||
            normalizeString(record.date) ||
            normalizeString(record.month);

        if (!label) {
            return;
        }

        const cost =
            normalizeNumber(record.cost) ??
            normalizeNumber(record.value) ??
            normalizeNumber(record.amount) ??
            normalizeNumber(record.total_cost) ??
            normalizeNumber(record.expense) ??
            0;

        const existing = seen.get(label);

        if (existing) {
            existing.cost = cost;
            return;
        }

        const trend: OperationalMaintenanceTrend = {
            label,
            cost,
        };

        seen.set(label, trend);
        timeline.push(trend);
    });

    return timeline;
};

export type OperationalAnalyticsFilters = AnalyticsFilters;

export type UseOperationalAnalyticsResult = {
    overview?: OperationalOverview;
    topCars: OperationalTopCar[];
    maintenanceTrends: OperationalMaintenanceTrend[];
    isLoading: boolean;
    isRefreshing: boolean;
    isError: boolean;
    refresh: () => Promise<void>;
};

export const useOperationalAnalytics = (
    filters: OperationalAnalyticsFilters = DEFAULT_ANALYTICS_FILTERS,
): UseOperationalAnalyticsResult => {
    const activeFilters = filters ?? DEFAULT_ANALYTICS_FILTERS;

    const overviewKey = useMemo(
        () => buildAnalyticsUrl(API_BASE_URL+ '/analytics/operational/overview', activeFilters),
        [activeFilters],
    );

    const topKey = useMemo(
        () => buildAnalyticsUrl(API_BASE_URL+ '/analytics/operational/top', activeFilters),
        [activeFilters],
    );

    const {
        data: overview,
        error: overviewError,
        isValidating: overviewValidating,
        mutate: mutateOverview,
    } = useSWR<OperationalOverview>(overviewKey, jsonFetcher, {
        revalidateOnFocus: false,
    });

    const {
        data: topResponse,
        error: topError,
        isValidating: topValidating,
        mutate: mutateTop,
    } = useSWR<OperationalTopResponse>(topKey, jsonFetcher, {
        revalidateOnFocus: false,
    });

    const topCars = useMemo(() => extractTopCars(topResponse, overview), [topResponse, overview]);
    const maintenanceTrends = useMemo(
        () => extractMaintenanceTrends(topResponse, overview),
        [topResponse, overview],
    );

    const refresh = useCallback(async () => {
        const tasks: Array<Promise<unknown>> = [];

        if (overviewKey) {
            tasks.push(mutateOverview());
        }

        if (topKey) {
            tasks.push(mutateTop());
        }

        await Promise.all(tasks);
    }, [mutateOverview, mutateTop, overviewKey, topKey]);

    const isLoading =
        Boolean(overviewKey && typeof overview === 'undefined' && !overviewError) ||
        Boolean(topKey && typeof topResponse === 'undefined' && !topError);

    const isRefreshing = Boolean(overviewKey && overviewValidating) || Boolean(topKey && topValidating);
    const isError = Boolean((overviewKey && overviewError) || (topKey && topError));

    return {
        overview,
        topCars,
        maintenanceTrends,
        isLoading,
        isRefreshing,
        isError,
        refresh,
    };
};

export default useOperationalAnalytics;
