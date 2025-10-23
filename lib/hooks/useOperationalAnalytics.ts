'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

import type {
    OperationalMaintenanceTrend,
    OperationalOverview,
    OperationalTopCar,
    OperationalTopResponse,
} from '@/types/analytics-operational';

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
    const candidateKeys = ['id', 'car_id', 'vehicle_id', 'uuid'];

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

const extractTopCars = (payload?: OperationalTopResponse | null): OperationalTopCar[] => {
    const rawItems =
        (payload?.top_cars && Array.isArray(payload.top_cars) && payload.top_cars) ||
        (payload?.cars && Array.isArray(payload.cars) && payload.cars) ||
        (payload?.items && Array.isArray(payload.items) && payload.items) ||
        (payload?.data && Array.isArray(payload.data) && payload.data) ||
        [];

    return rawItems
        .map((entry, index) => {
            const record = (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}) ?? {};
            const name =
                normalizeString(record.name) ||
                normalizeString(record.car_name) ||
                normalizeString(record.model) ||
                normalizeString(record.plate) ||
                `Mașină ${index + 1}`;

            const profit =
                normalizeNumber(record.profit) ??
                normalizeNumber(record.total_profit) ??
                normalizeNumber(record.value) ??
                normalizeNumber(record.amount) ??
                normalizeNumber(record.revenue) ??
                0;

            const id = resolveIdentifier(record, index);

            return {
                id,
                name,
                profit,
            } satisfies OperationalTopCar;
        })
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10);
};

const extractMaintenanceTrends = (payload?: OperationalTopResponse | null): OperationalMaintenanceTrend[] => {
    const rawItems =
        (payload?.maintenance_trends && Array.isArray(payload.maintenance_trends) && payload.maintenance_trends) ||
        (payload?.trends && Array.isArray(payload.trends) && payload.trends) ||
        (payload?.maintenance && Array.isArray(payload.maintenance) && payload.maintenance) ||
        [];

    return rawItems
        .map((entry) => {
            const record = (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}) ?? {};
            const label =
                normalizeString(record.label) ||
                normalizeString(record.period) ||
                normalizeString(record.date) ||
                normalizeString(record.month);

            if (!label) {
                return null;
            }

            const cost =
                normalizeNumber(record.cost) ??
                normalizeNumber(record.value) ??
                normalizeNumber(record.amount) ??
                normalizeNumber(record.total_cost) ??
                0;

            return {
                label,
                cost,
            } satisfies OperationalMaintenanceTrend;
        })
        .filter((entry): entry is OperationalMaintenanceTrend => entry !== null);
};

export type UseOperationalAnalyticsResult = {
    overview?: OperationalOverview;
    topCars: OperationalTopCar[];
    maintenanceTrends: OperationalMaintenanceTrend[];
    isLoading: boolean;
    isRefreshing: boolean;
    isError: boolean;
    refresh: () => Promise<void>;
};

export const useOperationalAnalytics = (): UseOperationalAnalyticsResult => {
    const {
        data: overview,
        error: overviewError,
        isValidating: overviewValidating,
        mutate: mutateOverview,
    } = useSWR<OperationalOverview>('/api/analytics/operational/overview', jsonFetcher, {
        revalidateOnFocus: false,
    });

    const {
        data: topResponse,
        error: topError,
        isValidating: topValidating,
        mutate: mutateTop,
    } = useSWR<OperationalTopResponse>('/api/analytics/operational/top', jsonFetcher, {
        revalidateOnFocus: false,
    });

    const topCars = useMemo(() => extractTopCars(topResponse), [topResponse]);
    const maintenanceTrends = useMemo(() => extractMaintenanceTrends(topResponse), [topResponse]);

    const refresh = useCallback(async () => {
        await Promise.all([mutateOverview(), mutateTop()]);
    }, [mutateOverview, mutateTop]);

    const isLoading =
        (typeof overview === 'undefined' && !overviewError) || (typeof topResponse === 'undefined' && !topError);

    const isRefreshing = overviewValidating || topValidating;
    const isError = Boolean(overviewError || topError);

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
