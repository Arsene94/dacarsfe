'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Loader2, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
    ANALYTICS_PERIOD_OPTIONS,
    DEFAULT_ANALYTICS_FILTERS,
    describeAnalyticsFilters,
    type AnalyticsPeriod,
} from '@/lib/analytics/filters';
import { usePredictiveAnalytics } from '@/lib/hooks/usePredictiveAnalytics';

const numberFormatter = new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: 0,
});

const tooltipLabelFormatter = (label?: string): string => {
    if (!label) {
        return 'Categorie necunoscută';
    }

    return label;
};

const tooltipValueFormatter = (value?: number): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '0';
    }

    return `${numberFormatter.format(value)} rezervări estimate`;
};

const forecastCardClass =
    'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md focus-within:shadow-md';

const recommendationCardClass =
    'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4';

const formatForecastPeriod = (values: string[]): string | null => {
    const unique = Array.from(new Set(values.filter((value) => value && value.trim().length > 0)));

    if (unique.length === 0) {
        return null;
    }

    const formatted = unique
        .map((value) => {
            const normalized = value.includes('-') && value.length <= 7 ? `${value}-01` : value;
            const parsed = new Date(normalized);

            if (Number.isNaN(parsed.getTime())) {
                return value;
            }

            return parsed.toLocaleDateString('ro-RO', {
                month: 'long',
                year: 'numeric',
            });
        })
        .filter((value) => value && value.trim().length > 0);

    if (formatted.length === 0) {
        return null;
    }

    if (formatted.length === 1) {
        return formatted[0];
    }

    return formatted.join(', ');
};

export default function PredictiveDashboardPage() {
    const [activeFilters, setActiveFilters] = useState(() => ({
        ...DEFAULT_ANALYTICS_FILTERS,
    }));
    const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(DEFAULT_ANALYTICS_FILTERS.period);
    const [customRangeDraft, setCustomRangeDraft] = useState<{ start: string; end: string }>(() => ({
        start: '',
        end: '',
    }));
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

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

    const {
        forecast,
        recommendations,
        context,
        isLoading,
        isRefreshing,
        isError,
        hasData,
        refresh,
        isContextLoading,
        isContextRefreshing,
    } = usePredictiveAnalytics(activeFilters);

    const dataReady = !isLoading && !isRefreshing && !isError;

    useEffect(() => {
        if (!dataReady) {
            return;
        }

        setLastUpdatedAt(new Date());
    }, [dataReady, forecast, recommendations, context]);

    const formattedLastUpdated = useMemo(() => {
        if (!lastUpdatedAt) {
            return null;
        }

        return lastUpdatedAt.toLocaleString('ro-RO', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    }, [lastUpdatedAt]);

    const forecastPeriodLabel = useMemo(
        () => formatForecastPeriod(forecast.map((entry) => entry.month)),
        [forecast],
    );

    const sortedForecast = useMemo(
        () =>
            [...forecast].sort((left, right) => right.predicted_demand - left.predicted_demand),
        [forecast],
    );

    const hasForecast = forecast.length > 0;
    const hasRecommendations =
        recommendations.buy.length > 0 || recommendations.sell.length > 0;
    const hasContextContent =
        (context.summary !== null && context.summary.trim().length > 0) ||
        context.opportunities.length > 0 ||
        context.risks.length > 0 ||
        context.actions.length > 0;
    const isContextBusy = isContextLoading || isContextRefreshing;

    const renderContextList = (items: string[], emptyMessage: string, keyPrefix: string) => {
        if (items.length === 0) {
            return <p className="text-sm text-slate-500">{emptyMessage}</p>;
        }

        return (
            <ul className="space-y-2">
                {items.map((item, index) => (
                    <li
                        key={`${keyPrefix}-${index}`}
                        className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-700"
                    >
                        {item}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="bg-slate-50 py-12">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-wide text-jade">
                            Analitice predictive
                        </p>
                        <h1 className="text-3xl font-bold text-berkeley">Analitice Predictive</h1>
                        <p className="max-w-2xl text-sm text-slate-600">
                            Vizualizează cererea estimată pe categorii și recomandările strategice generate de
                            DaCars pentru a decide rapid ce vehicule să achiziționezi sau să scoți din flotă.
                        </p>
                        <p className="text-xs text-slate-500">
                            Filtru activ:{' '}
                            <span className="font-medium text-slate-700">{activePeriodDescription}</span>
                        </p>
                        {formattedLastUpdated && (
                            <p className="text-xs text-slate-500">
                                Actualizat la: <span className="font-medium text-slate-700">{formattedLastUpdated}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-stretch">
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                            <Select
                                value={selectedPeriod}
                                onValueChange={handlePeriodChange}
                                className="w-full sm:w-48"
                                aria-label="Selectează perioada analizată"
                            >
                                {ANALYTICS_PERIOD_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                            {isCustomRangeSelected && (
                                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                                    <Input
                                        type="date"
                                        value={customRangeDraft.start}
                                        onChange={(event) =>
                                            setCustomRangeDraft((previous) => ({
                                                ...previous,
                                                start: event.target.value,
                                            }))
                                        }
                                        className="w-full sm:w-40"
                                        aria-label="Data de început pentru intervalul personalizat"
                                    />
                                    <Input
                                        type="date"
                                        value={customRangeDraft.end}
                                        onChange={(event) =>
                                            setCustomRangeDraft((previous) => ({
                                                ...previous,
                                                end: event.target.value,
                                            }))
                                        }
                                        className="w-full sm:w-40"
                                        aria-label="Data de final pentru intervalul personalizat"
                                    />
                                    <Button
                                        onClick={applyCustomRange}
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        aria-label="Aplică intervalul selectat"
                                        disabled={isApplyDisabled}
                                    >
                                        Aplică intervalul
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                            {isLoading && (
                                <span className="flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Se încarcă predicțiile...
                                </span>
                            )}
                            <Button
                                onClick={refresh}
                                className="w-full gap-2 sm:w-auto"
                                aria-label="Reîncarcă analiza predictivă"
                                disabled={isRefreshing}
                            >
                                <RotateCcw
                                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                />
                                <span>{isRefreshing ? 'Se actualizează...' : 'Reîncarcă analiza'}</span>
                            </Button>
                        </div>
                        {customHelperMessage && (
                            <p className={`text-xs ${customHelperTone}`}>{customHelperMessage}</p>
                        )}
                    </div>
                </header>

                {isError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                        Eroare la încărcarea predicțiilor. Încearcă din nou.
                    </div>
                )}

                {!isLoading && !isError && !hasData && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-800 shadow-sm">
                        Nu există suficiente date istorice pentru a genera o analiză predictivă.
                    </div>
                )}

                {(hasForecast || isLoading) && (
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div className={forecastCardClass}>
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold text-berkeley">
                                    Previziune cerere pe categorii – luna următoare
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {forecastPeriodLabel
                                        ? `Estimare pentru ${forecastPeriodLabel}.`
                                        : 'Estimare pentru perioada următoare, conform modelelor AI DaCars.'}
                                </p>
                            </div>
                            <div className="relative mt-6 h-80">
                                {isLoading ? (
                                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-100/60">
                                        <Loader2 className="h-8 w-8 animate-spin text-jade" aria-hidden="true" />
                                        <span className="sr-only">Se încarcă previziunile</span>
                                    </div>
                                ) : (
                                    <ResponsiveContainer>
                                        <AreaChart data={forecast}>
                                            <defs>
                                                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="category" tickLine={false} axisLine={false} stroke="#64748b" />
                                            <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                                            <Tooltip
                                                formatter={(value: number) => tooltipValueFormatter(value)}
                                                labelFormatter={tooltipLabelFormatter}
                                                contentStyle={{
                                                    borderRadius: 12,
                                                    borderColor: '#e2e8f0',
                                                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="predicted_demand"
                                                stroke="#0f766e"
                                                fill="url(#forecastGradient)"
                                                strokeWidth={2.5}
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                        <div className={forecastCardClass}>
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-berkeley">Cerere estimată pe categorii</h3>
                                <p className="text-sm text-slate-500">
                                    Ordine descrescătoare după numărul de rezervări estimate pentru intervalul selectat.
                                </p>
                            </div>
                            <div className="mt-4 space-y-3">
                                {sortedForecast.map((entry, index) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700">
                                                {index + 1}. {entry.category}
                                            </span>
                                            <span className="text-xs text-slate-500">Perioada: {entry.month}</span>
                                        </div>
                                        <span className="text-lg font-semibold text-berkeley">
                                            {numberFormatter.format(entry.predicted_demand)}
                                        </span>
                                    </div>
                                ))}
                                {!isLoading && sortedForecast.length === 0 && (
                                    <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                                        Nu există previziuni generate pentru această perioadă.
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {(hasRecommendations || isLoading) && (
                    <section className="grid gap-6 lg:grid-cols-2">
                        <div className={recommendationCardClass}>
                            <div>
                                <h3 className="text-lg font-semibold text-berkeley">Recomandările DaCars pentru flotă</h3>
                                <p className="text-sm text-slate-500">
                                    Modelele pe care algoritmii recomandă să le achiziționezi pentru a crește profitabilitatea.
                                </p>
                            </div>
                            {isLoading && !hasRecommendations ? (
                                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-100/60 px-4 py-6 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Se agregă recomandările...
                                </div>
                            ) : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-xl border border-jade/40 bg-jade/5 p-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wide text-jade">Cumpără</h4>
                                        <div className="mt-3 space-y-3">
                                            {recommendations.buy.map((item, index) => (
                                                <div
                                                    key={`${item.title}-${index}`}
                                                    className="rounded-lg border border-jade/30 bg-white px-3 py-2"
                                                >
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {item.title}
                                                            </p>
                                                            {item.link && (
                                                                <a
                                                                    href={item.link.href}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 rounded-md bg-jade/10 px-2.5 py-1 text-xs font-semibold text-jade transition hover:bg-jade/20 focus:outline-none focus:ring-2 focus:ring-jade focus:ring-offset-2"
                                                                >
                                                                    {item.link.label}
                                                                </a>
                                                            )}
                                                        </div>
                                                        {item.details.length > 0 && (
                                                            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                                                                {item.details.map((detail, detailIndex) => (
                                                                    <li key={`${detail}-${detailIndex}`}>{detail}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {recommendations.buy.length === 0 && (
                                                <p className="text-sm text-slate-500">
                                                    Momentan nu există recomandări de achiziție.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-600">Vinde</h4>
                                        <div className="mt-3 space-y-3">
                                            {recommendations.sell.map((item, index) => (
                                                <div
                                                    key={`${item.title}-${index}`}
                                                    className="rounded-lg border border-amber-200 bg-white px-3 py-2"
                                                >
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {item.title}
                                                            </p>
                                                            {item.link && (
                                                                <a
                                                                    href={item.link.href}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                                                                >
                                                                    {item.link.label}
                                                                </a>
                                                            )}
                                                        </div>
                                                        {item.details.length > 0 && (
                                                            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                                                                {item.details.map((detail, detailIndex) => (
                                                                    <li key={`${detail}-${detailIndex}`}>{detail}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {recommendations.sell.length === 0 && (
                                                <p className="text-sm text-slate-500">
                                                    Momentan nu există recomandări de vânzare.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={recommendationCardClass}>
                            <div>
                                <h3 className="text-lg font-semibold text-berkeley">Context strategic</h3>
                                <p className="text-sm text-slate-500">
                                    Folosește aceste date pentru a calibra bugetele, strategiile de preț și campaniile de achiziție.
                                </p>
                            </div>
                            {isContextBusy ? (
                                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-100/60 px-4 py-6 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    Se pregătește contextul strategic...
                                </div>
                            ) : hasContextContent ? (
                                <div className="space-y-4 text-sm text-slate-600">
                                    {context.summary && (
                                        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-slate-700">
                                            {context.summary}
                                        </div>
                                    )}
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-jade">
                                                Oportunități cheie
                                            </h4>
                                            {renderContextList(
                                                context.opportunities,
                                                'Nu au fost identificate oportunități majore pentru perioada selectată.',
                                                'opportunity',
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                                                Riscuri anticipate
                                            </h4>
                                            {renderContextList(
                                                context.risks,
                                                'Nu au fost identificate riscuri semnificative în acest moment.',
                                                'risk',
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold uppercase tracking-wide text-berkeley">
                                            Acțiuni recomandate
                                        </h4>
                                        {renderContextList(
                                            context.actions,
                                            'Nu există acțiuni recomandate generate pentru acest context.',
                                            'action',
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
                                    Nu a fost generat un context strategic pentru perioada selectată.
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
