export type AnalyticsPeriod =
    | 'week'
    | 'month'
    | 'quarter'
    | 'semester'
    | '6_months'
    | 'year'
    | 'custom';

export type AnalyticsFilters = {
    period: AnalyticsPeriod;
    startDate?: string;
    endDate?: string;
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = { period: 'month' };

export const ANALYTICS_PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
    { value: 'week', label: 'Ultima săptămână' },
    { value: 'month', label: 'Ultima lună' },
    { value: 'quarter', label: 'Ultimul trimestru' },
    { value: 'semester', label: 'Ultimul semestru' },
    { value: '6_months', label: 'Ultimele 6 luni' },
    { value: 'year', label: 'Ultimul an' },
    { value: 'custom', label: 'Interval personalizat' },
];

export const isAnalyticsFilterReady = (filters: AnalyticsFilters): boolean => {
    if (filters.period !== 'custom') {
        return true;
    }

    return Boolean(filters.startDate && filters.endDate);
};

export const createAnalyticsQuery = (filters: AnalyticsFilters): string | null => {
    const ready = isAnalyticsFilterReady(filters);

    if (!ready) {
        return null;
    }

    const params = new URLSearchParams();
    params.set('period', filters.period);

    if (filters.period === 'custom') {
        params.set('start_date', filters.startDate!);
        params.set('end_date', filters.endDate!);
    }

    return params.toString();
};

const formatDate = (value?: string): string | null => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export const describeAnalyticsFilters = (filters: AnalyticsFilters): string => {
    if (filters.period === 'custom') {
        const start = formatDate(filters.startDate);
        const end = formatDate(filters.endDate);

        if (start && end) {
            return `Interval personalizat (${start} – ${end})`;
        }

        return 'Interval personalizat';
    }

    const option = ANALYTICS_PERIOD_OPTIONS.find((entry) => entry.value === filters.period);

    return option?.label ?? 'Ultima lună';
};
