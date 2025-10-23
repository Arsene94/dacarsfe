'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    PolarAngleAxis,
    RadialBar,
    RadialBarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOperationalAnalytics, type OperationalAnalyticsFilters } from '@/lib/hooks/useOperationalAnalytics';
import {
    ANALYTICS_PERIOD_OPTIONS,
    DEFAULT_ANALYTICS_FILTERS,
    describeAnalyticsFilters,
    type AnalyticsPeriod,
} from '@/lib/analytics/filters';
import type { OperationalTopCar } from '@/types/analytics-operational';

const percentageFormatter = new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

const hoursFormatter = new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    notation: 'compact',
    maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('ro-RO');

const truncateLabel = (value: string): string => {
    if (value.length <= 18) {
        return value;
    }

    return `${value.slice(0, 15)}…`;
};

const coerceNumber = (value: number | string): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return 0;
};

const clampPercentage = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, value));
};

const tooltipContentStyle: CSSProperties = {
    borderRadius: '12px',
    borderColor: '#e5e7eb',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
};

export default function OperationalDashboardPage() {
    const [activeFilters, setActiveFilters] = useState<OperationalAnalyticsFilters>(() => ({
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

    const { overview, topCars, maintenanceTrends, isLoading, isRefreshing, isError, refresh } =
        useOperationalAnalytics(activeFilters);

    const fleetUtilization = clampPercentage(overview?.fleet_utilization_rate ?? 0);
    const idleHoursRaw = overview?.average_idle_time ?? 0;
    const maintenanceAverageRaw = overview?.maintenance_cost_avg ?? 0;
    const totalKilometresRaw = overview?.total_km_driven ?? 0;

    const idleHours = Number.isFinite(idleHoursRaw) ? idleHoursRaw : 0;
    const maintenanceAverage = Number.isFinite(maintenanceAverageRaw) ? maintenanceAverageRaw : 0;
    const totalKilometres = Number.isFinite(totalKilometresRaw) ? totalKilometresRaw : 0;

    return (
        <div className="bg-slate-50 py-12">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-wide text-jade">Tablou de bord operațional</p>
                        <h1 className="text-3xl font-bold text-berkeley">Performanță flotă și costuri de mentenanță</h1>
                        <p className="max-w-2xl text-sm text-slate-600">
                            Monitorizează gradul de utilizare al flotei, timpul mediu de staționare și evoluția
                            costurilor pentru a lua decizii rapide și informate.
                        </p>
                        <p className="text-xs text-slate-500">
                            Filtru activ:{' '}
                            <span className="font-medium text-slate-700">{activePeriodDescription}</span>
                        </p>
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
                                <span className="text-sm text-slate-500" aria-live="polite">
                                    Se încarcă datele inițiale...
                                </span>
                            )}
                            <Button
                                onClick={refresh}
                                className="w-full gap-2 sm:w-auto"
                                aria-label="Reîncarcă datele operaționale"
                                disabled={isRefreshing}
                            >
                                <RotateCcw
                                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                />
                                <span>{isRefreshing ? 'Se actualizează...' : 'Reîncarcă datele'}</span>
                            </Button>
                        </div>
                        {customHelperMessage && (
                            <p className={`text-xs ${customHelperTone}`}>{customHelperMessage}</p>
                        )}
                    </div>
                </header>

                {isError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                        Nu am putut încărca toate datele operaționale. Încearcă din nou sau reîncarcă pagina.
                    </div>
                )}

                <section className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-berkeley">Utilizare flotă</h2>
                            <p className="text-sm text-slate-500">
                                Raportul dintre mașinile active și capacitatea totală disponibilă în prezent.
                            </p>
                        </div>
                        <div className="relative mt-8 h-64">
                            <ResponsiveContainer>
                                <RadialBarChart
                                    data={[{ name: 'Utilizare', value: fleetUtilization }]}
                                    startAngle={90}
                                    endAngle={-270}
                                    innerRadius="60%"
                                    outerRadius="100%"
                                >
                                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                    <RadialBar
                                        dataKey="value"
                                        fill="#206442"
                                        cornerRadius={18}
                                        background={{ fill: '#E2E8F0' }}
                                        barSize={26}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                                <span className="text-4xl font-semibold text-berkeley">
                                    {percentageFormatter.format(fleetUtilization)}%
                                </span>
                                <span className="text-xs uppercase tracking-wide text-slate-500">Grad utilizare</span>
                            </div>
                        </div>
                        <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-4">
                                <dt className="text-slate-500">Timp mediu staționare</dt>
                                <dd className="mt-1 text-lg font-semibold text-berkeley">
                                    {hoursFormatter.format(idleHours)} h
                                </dd>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4">
                                <dt className="text-slate-500">Cost mediu mentenanță</dt>
                                <dd className="mt-1 text-lg font-semibold text-berkeley">
                                    {currencyFormatter.format(maintenanceAverage)}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                                <dt className="text-slate-500">Kilometri parcurși</dt>
                                <dd className="mt-1 text-lg font-semibold text-berkeley">
                                    {numberFormatter.format(totalKilometres)} km
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-berkeley">Top 10 mașini după profit</h2>
                                <p className="text-sm text-slate-500">
                                    Analizează contribuția fiecărui vehicul la profitul operațional din perioada selectată.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 h-80">
                            {topCars.length > 0 ? (
                                <ResponsiveContainer>
                                    <BarChart
                                        data={topCars}
                                        margin={{ top: 12, right: 16, left: 0, bottom: 12 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                                        <XAxis
                                            dataKey="licensePlate"
                                            tickLine={false}
                                            axisLine={false}
                                            interval={0}
                                            height={70}
                                            angle={-25}
                                            textAnchor="end"
                                            tick={({ x, y, payload }) => {
                                                const label = typeof payload?.value === 'string' ? payload.value : '';
                                                return (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        dy={16}
                                                        fill="#475569"
                                                        fontSize={12}
                                                        textAnchor="end"
                                                    >
                                                        {truncateLabel(label)}
                                                    </text>
                                                );
                                            }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            width={80}
                                            tickFormatter={(value: number) =>
                                                compactCurrencyFormatter.format(coerceNumber(value))
                                            }
                                        />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(30, 64, 175, 0.08)' }}
                                                formatter={(value: number | string) => [
                                                    currencyFormatter.format(coerceNumber(value)),
                                                    'Profit',
                                                ]}
                                                labelFormatter={(label, payload) => {
                                                    const entry = payload?.[0]?.payload as
                                                        | OperationalTopCar
                                                        | undefined;

                                                    if (!entry) {
                                                        if (typeof label === 'string') {
                                                            return label;
                                                        }

                                                        if (typeof label === 'number') {
                                                            return numberFormatter.format(label);
                                                        }

                                                        return '—';
                                                    }

                                                    if (entry.carName && entry.carName !== entry.licensePlate) {
                                                        return `${entry.licensePlate} • ${entry.carName}`;
                                                    }

                                                    return entry.licensePlate;
                                                }}
                                                contentStyle={tooltipContentStyle}
                                            />
                                            <Bar dataKey="profit" radius={[8, 8, 0, 0]} fill="#1A3661" />
                                        </BarChart>
                                    </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                                    Nu există suficiente date pentru a calcula topul mașinilor.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-semibold text-berkeley">Trend costuri de mentenanță</h2>
                            <p className="text-sm text-slate-500">
                                Vizualizează evoluția cheltuielilor de mentenanță și identifică perioadele cu valori ridicate.
                            </p>
                        </div>
                        <div className="mt-6 h-80">
                            {maintenanceTrends.length > 0 ? (
                                <ResponsiveContainer>
                                    <LineChart data={maintenanceTrends} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                                        <XAxis
                                            dataKey="label"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#475569', fontSize: 12 }}
                                        />
                                        <YAxis
                                            width={80}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value: number) =>
                                                compactCurrencyFormatter.format(coerceNumber(value))
                                            }
                                        />
                                        <Tooltip
                                            formatter={(value: number | string) => [
                                                currencyFormatter.format(coerceNumber(value)),
                                                'Cost',
                                            ]}
                                            labelFormatter={(label) => label}
                                            contentStyle={tooltipContentStyle}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cost"
                                            stroke="#38B275"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2, stroke: '#14532d', fill: '#38B275' }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                                    Nu există înregistrări de costuri pentru intervalul analizat.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-berkeley">Recomandări rapide</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Folosește insight-urile pentru a planifica redistribuiri de flotă și optimizări de costuri.
                        </p>
                        <ul className="mt-6 space-y-4 text-sm text-slate-600">
                            <li className="rounded-xl bg-slate-50 p-4">
                                <span className="font-semibold text-berkeley">Verifică vehiculele cu profit scăzut.</span>
                                <p className="mt-1 text-sm text-slate-500">
                                    Mașinile din partea de jos a clasamentului pot necesita ajustări de tarif sau campanii de
                                    promovare.
                                </p>
                            </li>
                            <li className="rounded-xl bg-slate-50 p-4">
                                <span className="font-semibold text-berkeley">Programează mentenanța preventivă.</span>
                                <p className="mt-1 text-sm text-slate-500">
                                    Perioadele cu costuri ridicate indică necesitatea unei revizuiri a planului de întreținere.
                                </p>
                            </li>
                            <li className="rounded-xl bg-slate-50 p-4">
                                <span className="font-semibold text-berkeley">Optimizează rotația flotei.</span>
                                <p className="mt-1 text-sm text-slate-500">
                                    Reducerea timpului de staționare crește rata de utilizare și veniturile per vehicul.
                                </p>
                            </li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
}
