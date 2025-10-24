'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
    useMarketingAnalytics,
    type MarketingAnalyticsFilters,
} from '@/lib/hooks/useMarketingAnalytics';
import {
    ANALYTICS_PERIOD_OPTIONS,
    DEFAULT_ANALYTICS_FILTERS,
    describeAnalyticsFilters,
    type AnalyticsPeriod,
} from '@/lib/analytics/filters';

const percentageFormatter = new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const ratingFormatter = new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const tooltipContentStyle: CSSProperties = {
    borderRadius: '12px',
    borderColor: '#e5e7eb',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
};

const formatPercentage = (value: number | undefined): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '0%';
    }
    return `${percentageFormatter.format(value)}%`;
};

const formatConversion = (value: number | undefined): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '0%';
    }
    return `${percentageFormatter.format(value)}% rata de conversie`;
};

const kpiCardClassName =
    'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md focus-within:shadow-md';

export default function MarketingDashboardPage() {
    const [activeFilters, setActiveFilters] = useState<MarketingAnalyticsFilters>(() => ({
        ...DEFAULT_ANALYTICS_FILTERS,
    }));
    const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(DEFAULT_ANALYTICS_FILTERS.period);
    const [customRangeDraft, setCustomRangeDraft] = useState<{ start: string; end: string }>(() => ({
        start: '',
        end: '',
    }));

    useEffect(() => {
        if (selectedPeriod !== 'custom') {
            return;
        }

        if (activeFilters.period === 'custom') {
            setCustomRangeDraft({
                start: activeFilters.startDate ?? '',
                end: activeFilters.endDate ?? '',
            });
            return;
        }

        setCustomRangeDraft({ start: '', end: '' });
    }, [selectedPeriod, activeFilters]);

    const handlePeriodChange = (value: string) => {
        const nextPeriod = value as AnalyticsPeriod;
        setSelectedPeriod(nextPeriod);

        if (nextPeriod !== 'custom') {
            setActiveFilters({ period: nextPeriod });
        }
    };

    const applyCustomRange = () => {
        if (customRangeDraft.start === '' || customRangeDraft.end === '') {
            return;
        }

        if (customRangeDraft.start > customRangeDraft.end) {
            return;
        }

        setActiveFilters({
            period: 'custom',
            startDate: customRangeDraft.start,
            endDate: customRangeDraft.end,
        });
    };

    const isCustomRangeSelected = selectedPeriod === 'custom';
    const isCustomRangeComplete = customRangeDraft.start !== '' && customRangeDraft.end !== '';
    const isCustomRangeInvalidOrder =
        isCustomRangeComplete && customRangeDraft.start > customRangeDraft.end;
    const matchesActiveCustomRange =
        activeFilters.period === 'custom' &&
        activeFilters.startDate === customRangeDraft.start &&
        activeFilters.endDate === customRangeDraft.end;
    const isApplyDisabled =
        !isCustomRangeComplete || isCustomRangeInvalidOrder || matchesActiveCustomRange;

    const customHelperMessage = useMemo(() => {
        if (!isCustomRangeSelected) {
            return null;
        }

        if (isCustomRangeInvalidOrder) {
            return 'Data de început trebuie să fie anterioară datei de final.';
        }

        if (!isCustomRangeComplete) {
            return 'Selectează atât data de început, cât și data de final pentru a aplica filtrul.';
        }

        if (!matchesActiveCustomRange) {
            return 'Apasă „Aplică intervalul” pentru a actualiza datele conform intervalului ales.';
        }

        return null;
    }, [
        isCustomRangeSelected,
        isCustomRangeInvalidOrder,
        isCustomRangeComplete,
        matchesActiveCustomRange,
    ]);

    const customHelperTone = isCustomRangeInvalidOrder ? 'text-red-600' : 'text-slate-500';

    const activePeriodDescription = useMemo(
        () => describeAnalyticsFilters(activeFilters),
        [activeFilters],
    );

    const { overview, channels, retentionSeries, isLoading, isRefreshing, isError, refresh } =
        useMarketingAnalytics(activeFilters);

    const kpis = useMemo(
        () => [
            {
                label: 'Total clienți',
                value: overview ? integerFormatter.format(overview.total_customers) : '—',
                helper: 'Numărul total de clienți activi în intervalul selectat.',
            },
            {
                label: 'Rată de retenție',
                value: overview ? formatPercentage(overview.retention_rate) : '—',
                helper: 'Procentul clienților care au revenit în perioada analizată.',
            },
            {
                label: 'Valoare medie LTV',
                value: overview ? currencyFormatter.format(overview.average_LTV) : '—',
                helper: 'Valoarea medie a veniturilor generate de un client.',
            },
            {
                label: 'Rating mediu',
                value: overview ? ratingFormatter.format(overview.average_rating) : '—',
                helper: 'Satisfacția medie declarată de clienți.',
            },
        ],
        [overview],
    );

    const channelData = useMemo(
        () =>
            channels.map((entry) => ({
                ...entry,
                conversionRate: entry.conversion_rate,
                channelLabel: entry.channel,
                cpaValue: entry.CPA,
                bookingsCount: entry.bookings,
                avgRevenue: entry.avg_revenue,
                totalRevenue: entry.total_revenue,
                costPerLead: entry.cost_per_lead,
            })),
        [channels],
    );

    const retentionData = useMemo(
        () =>
            retentionSeries.map((entry) => ({
                ...entry,
                retentionValue: entry.retention_rate,
            })),
        [retentionSeries],
    );

    const hasChannels = channelData.length > 0;
    const hasRetentionSeries = retentionData.length > 0;

    return (
        <div className="bg-slate-50 py-12">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-wide text-jade">
                            Tablou de bord marketing
                        </p>
                        <h1 className="text-3xl font-bold text-berkeley">
                            Campanii, retenție și performanță pe canale
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-600">
                            Monitorizează eficiența canalelor de achiziție, rata de retenție și valoarea
                            medie a clienților pentru a investi în campaniile care generează rezultate.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 md:w-auto">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                                {ANALYTICS_PERIOD_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => refresh()}
                                disabled={isRefreshing}
                                className="inline-flex items-center gap-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reîncarcă datele
                            </Button>
                        </div>
                        {isCustomRangeSelected ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Input
                                        type="date"
                                        value={customRangeDraft.start}
                                        onChange={(event) =>
                                            setCustomRangeDraft((prev) => ({
                                                ...prev,
                                                start: event.target.value,
                                            }))
                                        }
                                        className="w-full sm:w-48"
                                        aria-label="Data de început"
                                    />
                                    <Input
                                        type="date"
                                        value={customRangeDraft.end}
                                        onChange={(event) =>
                                            setCustomRangeDraft((prev) => ({
                                                ...prev,
                                                end: event.target.value,
                                            }))
                                        }
                                        className="w-full sm:w-48"
                                        aria-label="Data de final"
                                    />
                                    <Button
                                        type="button"
                                        onClick={applyCustomRange}
                                        disabled={isApplyDisabled}
                                        className="w-full sm:w-auto"
                                    >
                                        Aplică intervalul
                                    </Button>
                                </div>
                                {customHelperMessage ? (
                                    <p className={`text-xs ${customHelperTone}`}>{customHelperMessage}</p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </header>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-berkeley">Indicatori cheie</h2>
                            <p className="text-sm text-slate-500">{activePeriodDescription}</p>
                        </div>
                        {isError ? (
                            <p className="text-sm font-medium text-red-600">
                                A apărut o eroare la încărcarea datelor. Încearcă din nou mai târziu.
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {kpis.map((kpi) => (
                            <article key={kpi.label} className={kpiCardClassName}>
                                <h3 className="text-sm font-semibold text-slate-500">{kpi.label}</h3>
                                <p className="mt-3 text-3xl font-bold text-berkeley">{kpi.value}</p>
                                <p className="mt-2 text-xs text-slate-500">{kpi.helper}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-berkeley">
                                    Performanța canalelor
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Ratele de conversie pentru principalele surse de trafic.
                                </p>
                            </div>
                            {!hasChannels && !isLoading ? (
                                <p className="text-sm font-medium text-slate-500">
                                    Nu există date pentru performanța canalelor.
                                </p>
                            ) : null}
                        </div>
                        <div className="mt-6 h-80 w-full">
                            {hasChannels ? (
                                <>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={channelData}
                                            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                                        >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="channelLabel" tickLine={false} stroke="#94a3b8" />
                                        <YAxis
                                            tickFormatter={(value: number) => `${percentageFormatter.format(value)}%`}
                                            stroke="#94a3b8"
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={tooltipContentStyle}
                                            cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                                            formatter={(value: number, _name, payload) => {
                                                const details = payload?.payload as
                                                    | {
                                                          channelLabel?: string;
                                                          cpaValue?: number | null;
                                                          bookingsCount?: number;
                                                          avgRevenue?: number | null;
                                                          totalRevenue?: number | null;
                                                          costPerLead?: number | null;
                                                      }
                                                    | undefined;

                                                const segments: string[] = [formatConversion(value)];

                                                if (
                                                    typeof details?.bookingsCount === 'number'
                                                    && Number.isFinite(details.bookingsCount)
                                                ) {
                                                    segments.push(
                                                        `${integerFormatter.format(details.bookingsCount)} rezervări`,
                                                    );
                                                }

                                                if (
                                                    typeof details?.totalRevenue === 'number'
                                                    && Number.isFinite(details.totalRevenue)
                                                ) {
                                                    segments.push(
                                                        `Venit total ${currencyFormatter.format(details.totalRevenue)}`,
                                                    );
                                                }

                                                if (
                                                    typeof details?.avgRevenue === 'number'
                                                    && Number.isFinite(details.avgRevenue)
                                                ) {
                                                    segments.push(
                                                        `Venit mediu ${currencyFormatter.format(details.avgRevenue)}`,
                                                    );
                                                }

                                                if (
                                                    typeof details?.cpaValue === 'number'
                                                    && Number.isFinite(details.cpaValue)
                                                ) {
                                                    segments.push(
                                                        `CPA ${currencyFormatter.format(details.cpaValue)}`,
                                                    );
                                                }

                                                if (
                                                    typeof details?.costPerLead === 'number'
                                                    && Number.isFinite(details.costPerLead)
                                                ) {
                                                    segments.push(
                                                        `CPL ${currencyFormatter.format(details.costPerLead)}`,
                                                    );
                                                }

                                                return [
                                                    segments.join(' • '),
                                                    details?.channelLabel ?? 'Canal',
                                                ];
                                            }}
                                            labelFormatter={() => 'Detalii canal'}
                                        />
                                        <Bar dataKey="conversionRate" radius={[8, 8, 0, 0]}>
                                            {channelData.map((entry) => (
                                                <Cell
                                                    key={entry.id}
                                                    fill="#0A3965"
                                                    aria-label={`${entry.channelLabel}: ${formatPercentage(entry.conversionRate)}`}
                                                />
                                            ))}
                                        </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="mt-6 space-y-3">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                            Detalii pe canal
                                        </h3>
                                        <ul className="grid gap-4 sm:grid-cols-2">
                                            {channelData.map((entry) => (
                                                <li
                                                    key={`${entry.id}-details`}
                                                    className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                                >
                                                    <div className="flex h-full flex-col justify-between gap-4">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-berkeley">
                                                                {entry.channelLabel}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {formatPercentage(entry.conversionRate)} rată de conversie
                                                            </p>
                                                        </div>
                                                        <dl className="grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-2 sm:text-sm">
                                                            <div className="space-y-1">
                                                                <dt className="font-medium text-slate-500">Rezervări</dt>
                                                                <dd className="text-base font-semibold text-berkeley">
                                                                    {integerFormatter.format(entry.bookingsCount ?? 0)}
                                                                </dd>
                                                            </div>
                                                            {typeof entry.totalRevenue === 'number'
                                                            && Number.isFinite(entry.totalRevenue) ? (
                                                                <div className="space-y-1">
                                                                    <dt className="font-medium text-slate-500">Venit total</dt>
                                                                    <dd className="text-base font-semibold text-berkeley">
                                                                        {currencyFormatter.format(entry.totalRevenue)}
                                                                    </dd>
                                                                </div>
                                                            ) : null}
                                                            {typeof entry.avgRevenue === 'number'
                                                            && Number.isFinite(entry.avgRevenue) ? (
                                                                <div className="space-y-1">
                                                                    <dt className="font-medium text-slate-500">Venit mediu</dt>
                                                                    <dd className="text-base font-semibold text-berkeley">
                                                                        {currencyFormatter.format(entry.avgRevenue)}
                                                                    </dd>
                                                                </div>
                                                            ) : null}
                                                            {typeof entry.cpaValue === 'number'
                                                            && Number.isFinite(entry.cpaValue) ? (
                                                                <div className="space-y-1">
                                                                    <dt className="font-medium text-slate-500">CPA</dt>
                                                                    <dd className="text-base font-semibold text-berkeley">
                                                                        {currencyFormatter.format(entry.cpaValue)}
                                                                    </dd>
                                                                </div>
                                                            ) : null}
                                                            {typeof entry.costPerLead === 'number'
                                                            && Number.isFinite(entry.costPerLead) ? (
                                                                <div className="space-y-1">
                                                                    <dt className="font-medium text-slate-500">CPL</dt>
                                                                    <dd className="text-base font-semibold text-berkeley">
                                                                        {currencyFormatter.format(entry.costPerLead)}
                                                                    </dd>
                                                                </div>
                                                            ) : null}
                                                        </dl>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-sm text-slate-500">
                                        {isLoading
                                            ? 'Încărcăm performanța canalelor...'
                                            : 'Datele pentru performanța canalelor nu sunt disponibile în acest moment.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-berkeley">
                                    Evoluția ratei de retenție
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Analizează modul în care retenția clienților evoluează în timp.
                                </p>
                            </div>
                            {!hasRetentionSeries && !isLoading ? (
                                <p className="text-sm font-medium text-slate-500">
                                    Nu există date pentru evoluția retenției.
                                </p>
                            ) : null}
                        </div>
                        <div className="mt-6 h-80 w-full">
                            {hasRetentionSeries ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={retentionData}
                                        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="label" tickLine={false} stroke="#94a3b8" />
                                        <YAxis
                                            domain={[0, 100]}
                                            tickFormatter={(value: number) => `${percentageFormatter.format(value)}%`}
                                            stroke="#94a3b8"
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={tooltipContentStyle}
                                            formatter={(value: number, _name, payload) => [
                                                formatPercentage(value),
                                                payload?.payload?.label ?? 'Perioadă',
                                            ]}
                                            labelFormatter={() => 'Detalii retenție'}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="retentionValue"
                                            stroke="#206442"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#206442' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-sm text-slate-500">
                                        {isLoading
                                            ? 'Încărcăm evoluția retenției...'
                                            : 'Datele privind retenția clienților nu sunt disponibile în acest moment.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
