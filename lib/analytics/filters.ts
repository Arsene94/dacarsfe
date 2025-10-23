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

type AnalyticsRange = { startDate: string; endDate: string };

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

const startOfDay = (value: Date): Date => {
    const copy = new Date(value);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const addDays = (value: Date, days: number): Date => {
    const copy = new Date(value);
    copy.setDate(copy.getDate() + days);
    return copy;
};

const subtractMonths = (value: Date, months: number): Date => {
    const copy = new Date(value);
    const day = copy.getDate();
    copy.setDate(1);
    copy.setMonth(copy.getMonth() - months);
    const lastDayOfTargetMonth = new Date(copy.getFullYear(), copy.getMonth() + 1, 0).getDate();
    copy.setDate(Math.min(day, lastDayOfTargetMonth));
    return copy;
};

const formatQueryDate = (value: Date): string => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const parseDateInput = (value?: string): Date | null => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return startOfDay(parsed);
};

export const resolveAnalyticsRange = (
    filters: AnalyticsFilters,
    referenceDate: Date = new Date(),
): AnalyticsRange | null => {
    if (!filters) {
        return null;
    }

    if (filters.period === 'custom') {
        const start = parseDateInput(filters.startDate);
        const end = parseDateInput(filters.endDate);

        if (!start || !end || start > end) {
            return null;
        }

        return {
            startDate: formatQueryDate(start),
            endDate: formatQueryDate(end),
        };
    }

    const today = startOfDay(referenceDate);
    let start: Date;

    switch (filters.period) {
        case 'week': {
            start = startOfDay(addDays(today, -6));
            break;
        }
        case 'month': {
            start = startOfDay(subtractMonths(today, 1));
            break;
        }
        case 'quarter': {
            start = startOfDay(subtractMonths(today, 3));
            break;
        }
        case 'semester': {
            const sixMonthsBack = subtractMonths(today, 6);
            start = startOfDay(new Date(sixMonthsBack.getFullYear(), sixMonthsBack.getMonth(), 1));
            break;
        }
        case '6_months': {
            start = startOfDay(subtractMonths(today, 6));
            break;
        }
        case 'year': {
            start = startOfDay(subtractMonths(today, 12));
            break;
        }
        default: {
            start = startOfDay(subtractMonths(today, 1));
        }
    }

    if (start > today) {
        start = startOfDay(subtractMonths(today, 1));
    }

    return {
        startDate: formatQueryDate(start),
        endDate: formatQueryDate(today),
    };
};

export const isAnalyticsFilterReady = (filters: AnalyticsFilters): boolean =>
    resolveAnalyticsRange(filters) !== null;

export const createAnalyticsQuery = (filters: AnalyticsFilters): string | null => {
    const range = resolveAnalyticsRange(filters);

    if (!range) {
        return null;
    }

    const params = new URLSearchParams();
    params.set('start_date', range.startDate);
    params.set('end_date', range.endDate);

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
    const range = resolveAnalyticsRange(filters);

    if (filters.period === 'custom') {
        if (range) {
            const start = formatDate(range.startDate);
            const end = formatDate(range.endDate);

            if (start && end) {
                return `Interval personalizat (${start} – ${end})`;
            }
        }

        return 'Interval personalizat';
    }

    const option = ANALYTICS_PERIOD_OPTIONS.find((entry) => entry.value === filters.period);

    if (!range) {
        return option?.label ?? 'Ultima lună';
    }

    const start = formatDate(range.startDate);
    const end = formatDate(range.endDate);

    if (start && end) {
        const label = option?.label ?? 'Ultima lună';
        return `${label} (${start} – ${end})`;
    }

    return option?.label ?? 'Ultima lună';
};
