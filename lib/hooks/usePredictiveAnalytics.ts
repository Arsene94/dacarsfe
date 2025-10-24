'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';

import type {
    PredictiveForecastPoint,
    PredictiveRecommendations,
    PredictiveForecastApi,
    PredictiveRecommendationsApi,
    PredictiveForecastResponse,
    PredictiveRecommendationsResponse,
    PredictiveContext,
    PredictiveContextApi,
    PredictiveContextResponse,
} from '@/types/analytics-predictive';
import {
    createAnalyticsQuery,
    DEFAULT_ANALYTICS_FILTERS,
    type AnalyticsFilters,
} from '@/lib/analytics/filters';
import { API_BASE_URL } from '@/lib/api';

const jsonFetcher = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Nu am putut încărca analizele predictive.');
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

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value.toString();
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const buildIdentifier = (record: Record<string, unknown>, fallback: number): number | string => {
    const candidateKeys = [
        'id',
        'uuid',
        'entry_id',
        'category_id',
        'category',
        'segment',
        'type',
        'label',
        'name',
        'code',
    ];

    for (const key of candidateKeys) {
        if (!(key in record)) {
            continue;
        }

        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        const normalized = normalizeString(value);
        if (normalized) {
            return normalized;
        }
    }

    const month =
        normalizeString(record.month) ||
        normalizeString(record.period) ||
        'perioada';
    const category =
        normalizeString(record.category) ||
        normalizeString(record.segment) ||
        normalizeString(record.type) ||
        normalizeString(record.label) ||
        `categorie-${fallback + 1}`;

    return `${month}-${category}-${fallback}`;
};

const collectForecastEntries = (
    ...sources: PredictiveForecastResponse[]
): PredictiveForecastApi[] => {
    const entries: PredictiveForecastApi[] = [];
    const visited = new Set<unknown>();
    const queue: unknown[] = [];

    sources.forEach((source) => {
        if (source !== null && typeof source !== 'undefined') {
            queue.push(source);
        }
    });

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === null || typeof current === 'undefined') {
            continue;
        }

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);

        if (Array.isArray(current)) {
            current.forEach((item) => {
                if (item !== null && typeof item !== 'undefined') {
                    queue.push(item);
                }
            });
            continue;
        }

        if (isRecord(current)) {
            const record = current as PredictiveForecastApi;

            const hasForecastSignal =
                'predicted_demand' in record ||
                'predictedDemand' in record ||
                'demand' in record ||
                'value' in record ||
                'score' in record;

            if (hasForecastSignal) {
                entries.push(record);
            }

            const candidateKeys = [
                'forecast',
                'forecasts',
                'data',
                'items',
                'results',
                'entries',
                'series',
                'values',
                'list',
                'payload',
                'response',
                'dataset',
                'points',
            ];

            candidateKeys.forEach((key) => {
                if (key in current) {
                    const value = current[key as keyof typeof current];
                    if (value !== null && typeof value !== 'undefined') {
                        queue.push(value);
                    }
                }
            });
        }
    }

    return entries;
};

const buildRecommendationLabel = (record: Record<string, unknown>): string | null => {
    const name =
        normalizeString(record.name) ||
        normalizeString(record.model) ||
        normalizeString(record.vehicle) ||
        normalizeString(record.car) ||
        normalizeString(record.title) ||
        normalizeString(record.label) ||
        normalizeString(record.variant);

    const reason =
        normalizeString(record.reason) ||
        normalizeString(record.justification) ||
        normalizeString(record.context) ||
        normalizeString(record.motivation) ||
        normalizeString(record.details) ||
        normalizeString(record.description) ||
        normalizeString(record.summary);

    if (name && reason) {
        return `${name} — ${reason}`;
    }

    if (name) {
        return name;
    }

    if (reason) {
        return reason;
    }

    return null;
};

const BUY_KEYWORDS = ['buy', 'cumpara', 'achiz', 'acquire'];
const SELL_KEYWORDS = ['sell', 'vinde', 'cede', 'retire', 'dispose'];

const collectRecommendationLists = (
    ...sources: PredictiveRecommendationsResponse[]
): PredictiveRecommendations => {
    const buy: string[] = [];
    const sell: string[] = [];
    const visited = new Set<unknown>();

    const appendValue = (value: unknown, bucket: string[]) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => appendValue(entry, bucket));
            return;
        }

        const normalized = normalizeString(value);
        if (normalized) {
            bucket.push(normalized);
            return;
        }

        if (isRecord(value)) {
            const label = buildRecommendationLabel(value);
            if (label) {
                bucket.push(label);
            }
        }
    };

    const explore = (value: unknown) => {
        if (value === null || typeof value === 'undefined') {
            return;
        }

        if (visited.has(value)) {
            return;
        }

        visited.add(value);

        if (Array.isArray(value)) {
            value.forEach((entry) => explore(entry));
            return;
        }

        if (isRecord(value)) {
            const record = value as Record<string, unknown>;

            Object.entries(record).forEach(([key, nested]) => {
                const normalizedKey = key.toLowerCase();

                if (BUY_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))) {
                    appendValue(nested, buy);
                    return;
                }

                if (SELL_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))) {
                    appendValue(nested, sell);
                    return;
                }

                explore(nested);
            });

            return;
        }
    };

    sources.forEach((source) => {
        if (source !== null && typeof source !== 'undefined') {
            explore(source);
        }
    });

    const uniqueBuy = Array.from(new Set(buy));
    const uniqueSell = Array.from(new Set(sell));

    return {
        buy: uniqueBuy,
        sell: uniqueSell,
    };
};

const dedupeList = (values: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    values.forEach((value) => {
        if (!seen.has(value)) {
            seen.add(value);
            result.push(value);
        }
    });

    return result;
};

const collectStringValues = (value: unknown): string[] => {
    const collected: string[] = [];
    const visited = new Set<unknown>();

    const explore = (current: unknown) => {
        if (current === null || typeof current === 'undefined') {
            return;
        }

        if (visited.has(current)) {
            return;
        }

        visited.add(current);

        if (Array.isArray(current)) {
            current.forEach((entry) => explore(entry));
            return;
        }

        const normalized = normalizeString(current);
        if (normalized) {
            collected.push(normalized);
            return;
        }

        if (isRecord(current)) {
            const record = current as Record<string, unknown>;
            const prioritizedKeys = [
                'text',
                'description',
                'descriere',
                'context',
                'details',
                'detalii',
                'reason',
                'motiv',
                'label',
                'title',
                'name',
                'value',
                'message',
                'summary',
                'rezumat',
            ];

            prioritizedKeys.forEach((key) => {
                if (key in record) {
                    explore(record[key as keyof typeof record]);
                }
            });

            Object.values(record).forEach((entry) => explore(entry));
        }
    };

    explore(value);

    return dedupeList(collected);
};

const SUMMARY_KEYWORDS = ['summary', 'rezumat', 'overview', 'executive', 'context', 'sinte', 'descr'];
const OPPORTUNITY_KEYWORDS = ['opportunit', 'oportunit', 'growth', 'avantaj', 'benef'];
const RISK_KEYWORDS = ['risk', 'riscur', 'threat', 'amenint'];
const ACTION_KEYWORDS = ['action', 'acti', 'step', 'plan', 'recomand', 'recom'];

const mapContext = (
    ...sources: PredictiveContextResponse[]
): PredictiveContext => {
    const summaryCandidates: string[] = [];
    const opportunities: string[] = [];
    const risks: string[] = [];
    const actions: string[] = [];

    const visited = new Set<unknown>();
    const queue: unknown[] = [];

    sources.forEach((source) => {
        if (source !== null && typeof source !== 'undefined') {
            queue.push(source);
        }
    });

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === null || typeof current === 'undefined') {
            continue;
        }

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);

        if (Array.isArray(current)) {
            current.forEach((entry) => {
                if (!visited.has(entry)) {
                    queue.push(entry);
                }
            });
            continue;
        }

        if (isRecord(current)) {
            const record = current as PredictiveContextApi | Record<string, unknown>;

            Object.entries(record).forEach(([key, value]) => {
                const normalizedKey = key.toLowerCase();

                if (SUMMARY_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))) {
                    const summaryValues = collectStringValues(value);
                    if (summaryValues.length > 0) {
                        summaryValues.forEach((entry) => summaryCandidates.push(entry));
                    }
                }

                if (OPPORTUNITY_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))) {
                    opportunities.push(...collectStringValues(value));
                    return;
                }

                if (RISK_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))) {
                    risks.push(...collectStringValues(value));
                    return;
                }

                if (ACTION_KEYWORDS.some((keyword) => normalizedKey.includes(keyword))) {
                    actions.push(...collectStringValues(value));
                    return;
                }
            });

            Object.values(record).forEach((value) => {
                if (!visited.has(value)) {
                    queue.push(value);
                }
            });

            continue;
        }

        const normalized = normalizeString(current);
        if (normalized) {
            summaryCandidates.push(normalized);
        }
    }

    const summary = dedupeList(summaryCandidates)[0] ?? null;

    return {
        summary,
        opportunities: dedupeList(opportunities),
        risks: dedupeList(risks),
        actions: dedupeList(actions),
    } satisfies PredictiveContext;
};

const mapForecast = (
    ...sources: PredictiveForecastResponse[]
): PredictiveForecastPoint[] => {
    const entries = collectForecastEntries(...sources);

    const mapped = entries.map((entry, index) => {
        const record = (entry && typeof entry === 'object'
            ? (entry as Record<string, unknown>)
            : {}) as Record<string, unknown>;

        const month =
            normalizeString(entry.month) ||
            normalizeString(entry.period) ||
            normalizeString(record.label) ||
            'Perioada următoare';

        const category =
            normalizeString(entry.category) ||
            normalizeString(entry.segment) ||
            normalizeString(entry.type) ||
            normalizeString(record.label) ||
            `Categorie ${index + 1}`;

        const demand =
            normalizeNumber(entry.predicted_demand) ??
            normalizeNumber((record.predicted_demand as number | string | undefined) ?? null) ??
            normalizeNumber((record.predictedDemand as number | string | undefined) ?? null) ??
            normalizeNumber(entry.predictedDemand) ??
            normalizeNumber(entry.demand) ??
            normalizeNumber(entry.value) ??
            normalizeNumber(entry.score) ??
            0;

        const id = buildIdentifier(record, index);

        return {
            id,
            month: month ?? 'Perioada următoare',
            category: category ?? `Categorie ${index + 1}`,
            predicted_demand: Number.isFinite(demand) && demand !== null ? demand : 0,
        } satisfies PredictiveForecastPoint;
    });

    const deduplicated = new Map<PredictiveForecastPoint['id'], PredictiveForecastPoint>();
    mapped.forEach((entry) => {
        if (!deduplicated.has(entry.id)) {
            deduplicated.set(entry.id, entry);
        }
    });

    return Array.from(deduplicated.values());
};

export type PredictiveAnalyticsFilters = AnalyticsFilters;

const resolveFilters = (filters?: PredictiveAnalyticsFilters): AnalyticsFilters => ({
    ...DEFAULT_ANALYTICS_FILTERS,
    ...(filters ?? {}),
});

const buildKey = (endpoint: string, filters?: PredictiveAnalyticsFilters): string | null => {
    const normalized = resolveFilters(filters);
    const query = createAnalyticsQuery(normalized);

    if (!query) {
        return null;
    }

    return `${endpoint}?${query}`;
};

export const usePredictiveAnalytics = (filters?: PredictiveAnalyticsFilters) => {
    const normalizedFilters = useMemo(() => resolveFilters(filters), [filters]);

    const forecastKey = useMemo(
        () => buildKey(API_BASE_URL + '/analytics/predictive/forecast', normalizedFilters),
        [normalizedFilters],
    );

    const recommendationsKey = useMemo(
        () => buildKey(API_BASE_URL + '/analytics/predictive/recommendations', normalizedFilters),
        [normalizedFilters],
    );

    const contextKey = useMemo(
        () => buildKey(API_BASE_URL + '/analytics/predictive/context', normalizedFilters),
        [normalizedFilters],
    );

    const {
        data: forecastResponse,
        error: forecastError,
        isValidating: forecastValidating,
        mutate: mutateForecast,
    } = useSWR<PredictiveForecastResponse>(forecastKey, jsonFetcher, {
        revalidateOnFocus: false,
    });

    const {
        data: recommendationsResponse,
        error: recommendationsError,
        isValidating: recommendationsValidating,
        mutate: mutateRecommendations,
    } = useSWR<PredictiveRecommendationsResponse>(recommendationsKey, jsonFetcher, {
        revalidateOnFocus: false,
    });

    const {
        data: contextResponse,
        error: contextError,
        isValidating: contextValidating,
        mutate: mutateContext,
    } = useSWR<PredictiveContextResponse>(contextKey, jsonFetcher, {
        revalidateOnFocus: false,
    });

    const forecast = useMemo(
        () => mapForecast(forecastResponse, recommendationsResponse),
        [forecastResponse, recommendationsResponse],
    );

    const recommendations = useMemo(
        () => collectRecommendationLists(recommendationsResponse, forecastResponse),
        [recommendationsResponse, forecastResponse],
    );

    const context = useMemo(() => mapContext(contextResponse), [contextResponse]);

    const refresh = useCallback(async () => {
        const tasks: Array<Promise<unknown>> = [];

        if (forecastKey) {
            tasks.push(mutateForecast());
        }

        if (recommendationsKey) {
            tasks.push(mutateRecommendations());
        }

        if (contextKey) {
            tasks.push(mutateContext());
        }

        await Promise.all(tasks);
    }, [forecastKey, recommendationsKey, contextKey, mutateForecast, mutateRecommendations, mutateContext]);

    const isLoading =
        Boolean(forecastKey && typeof forecastResponse === 'undefined' && !forecastError) ||
        Boolean(recommendationsKey && typeof recommendationsResponse === 'undefined' && !recommendationsError) ||
        Boolean(contextKey && typeof contextResponse === 'undefined' && !contextError);

    const isRefreshing =
        Boolean(forecastKey && forecastValidating) ||
        Boolean(recommendationsKey && recommendationsValidating) ||
        Boolean(contextKey && contextValidating);

    const isError = Boolean(
        (forecastKey && forecastError) ||
        (recommendationsKey && recommendationsError) ||
        (contextKey && contextError),
    );

    const hasData = forecast.length > 0 || recommendations.buy.length > 0 || recommendations.sell.length > 0;

    return {
        forecast,
        recommendations,
        context,
        isLoading,
        isRefreshing,
        isError,
        hasData,
        refresh,
        isContextLoading: Boolean(contextKey && typeof contextResponse === 'undefined' && !contextError),
        isContextRefreshing: Boolean(contextKey && contextValidating),
    };
};

export default usePredictiveAnalytics;
