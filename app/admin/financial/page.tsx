'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useFinancialAnalytics, type FinancialAnalyticsFilters } from '@/lib/hooks/useFinancialAnalytics';
import {
    ANALYTICS_PERIOD_OPTIONS,
    DEFAULT_ANALYTICS_FILTERS,
    describeAnalyticsFilters,
    type AnalyticsPeriod,
} from '@/lib/analytics/filters';

const currencyFormatter = new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('ro-RO', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const tooltipContentStyle: CSSProperties = {
    borderRadius: '12px',
    borderColor: '#e5e7eb',
    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
};

const pieColors = ['#0A3965', '#206442', '#F89F1B', '#9333EA', '#ef4444', '#0ea5e9', '#14b8a6', '#f97316'];

const formatPercent = (value: number): string => percentFormatter.format(value / 100);

export default function FinancialDashboardPage() {
    const [activeFilters, setActiveFilters] = useState<FinancialAnalyticsFilters>(() => ({
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

    const { summary, categories, carRanking, isLoading, isRefreshing, isError, refresh } =
        useFinancialAnalytics(activeFilters);

    const revenue = summary?.total_revenue ?? 0;
    const netProfit = summary?.net_profit ?? 0;
    const roi = summary?.ROI ?? 0;
    const hasCategories = categories.length > 0;
    const hasCarRanking = carRanking.length > 0;
    const topVehiclesCount = Math.min(carRanking.length, 10);
    const topVehiclesLabel = hasCarRanking
        ? `Top ${topVehiclesCount} vehicule`
        : 'Clasament indisponibil momentan';

    return (
        <div className="bg-slate-50 py-12">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-wide text-jade">
                            Tablou de bord financiar
                        </p>
                        <h1 className="text-3xl font-bold text-berkeley">
                            Profitabilitatea flotei și performanța veniturilor
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-600">
                            Analizează veniturile, profitul și rentabilitatea investiției pentru a identifica cele mai
                            performante segmente de flotă și oportunitățile de optimizare.
                        </p>
                        <p className="text-xs text-slate-500">
                            Filtru activ:{' '}
                            <span className="font-medium text-slate-700">{activePeriodDescription}</span>
                        </p>
                    </div>
                    <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-stretch">
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <Select
                                value={selectedPeriod}
                                onValueChange={handlePeriodChange}
                                className="w-full sm:w-48"
                                aria-label="Selectează perioada financiară"
                            >
                                {ANALYTICS_PERIOD_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                            {isCustomRangeSelected && (
                                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
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
                                        aria-label="Data de început pentru perioada personalizată"
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
                                        aria-label="Data de final pentru perioada personalizată"
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
                        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
                            {isLoading && (
                                <span className="text-sm text-slate-500" aria-live="polite">
                                    Se încarcă datele financiare...
                                </span>
                            )}
                            <Button
                                onClick={refresh}
                                className="w-full gap-2 sm:w-auto"
                                aria-label="Reîncarcă datele financiare"
                                disabled={isRefreshing}
                            >
                                <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
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
                        Nu am putut încărca toate datele financiare. Încearcă din nou sau reîncarcă pagina.
                    </div>
                )}

                <section className="grid gap-6 md:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Venit total</p>
                        <p className="mt-2 text-3xl font-bold text-berkeley" aria-live="polite">
                            {currencyFormatter.format(revenue)}
                        </p>
                        <p className="mt-4 text-sm text-slate-500">
                            Suma generată de toate segmentele de flotă în ultima perioadă analizată.
                        </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Profit net</p>
                        <p className="mt-2 text-3xl font-bold text-berkeley" aria-live="polite">
                            {currencyFormatter.format(netProfit)}
                        </p>
                        <p className="mt-4 text-sm text-slate-500">
                            Diferența dintre venituri și cheltuieli, după deducerea costurilor operaționale.
                        </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">ROI</p>
                        <p className="mt-2 text-3xl font-bold text-berkeley" aria-live="polite">
                            {formatPercent(roi)}
                        </p>
                        <p className="mt-4 text-sm text-slate-500">
                            Rentabilitatea investiției pentru întreg portofoliul de mașini închiriate.
                        </p>
                    </article>
                </section>

                <section className="grid gap-6 lg:grid-cols-5">
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-berkeley">Venituri pe categorii</h2>
                            <p className="text-sm text-slate-500">
                                Analizează distribuția veniturilor pe tipuri de vehicule pentru a prioritiza investițiile.
                            </p>
                        </div>
                        <div className="mt-8 h-72">
                            {hasCategories ? (
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={categories}
                                            dataKey="revenue"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={4}
                                        >
                                            {categories.map((entry, index) => (
                                                <Cell
                                                    key={entry.id}
                                                    fill={pieColors[index % pieColors.length]}
                                                    aria-label={`${entry.name}: ${currencyFormatter.format(entry.revenue)}`}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={tooltipContentStyle}
                                            formatter={(value: number, name: string) => [
                                                currencyFormatter.format(value),
                                                name,
                                            ]}
                                        />
                                        <Legend
                                            layout="vertical"
                                            align="right"
                                            verticalAlign="middle"
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 12 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                                    Momentan nu există date pentru distribuția veniturilor. Verifică perioada selectată sau
                                    actualizează raportarea.
                                </div>
                            )}
                        </div>
                    </article>

                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-berkeley">Clasament profitabilitate mașini</h2>
                                <p className="text-sm text-slate-500">
                                    Identifică vehiculele cu cel mai mare aport la profitul total și optimizează alocarea.
                                </p>
                            </div>
                            <span className="text-xs uppercase tracking-wide text-slate-400">{topVehiclesLabel}</span>
                        </div>
                        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                            {hasCarRanking ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200 text-left">
                                        <thead className="bg-slate-100">
                                            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                <th scope="col" className="px-4 py-3">
                                                    Loc
                                                </th>
                                                <th scope="col" className="px-4 py-3">
                                                    Vehicul
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-right">
                                                    Venit
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-right">
                                                    Profit
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-right">
                                                    ROI
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {carRanking.slice(0, 10).map((car, index) => (
                                                <tr key={car.id} className="text-sm text-slate-600">
                                                    <td className="px-4 py-3 font-semibold text-berkeley">
                                                        #{index + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium text-slate-700">{car.name}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {currencyFormatter.format(car.revenue)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {currencyFormatter.format(car.profit)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {formatPercent(car.roi)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-slate-500">
                                    Nu există suficiente date pentru clasamentul vehiculelor. Reîncarcă datele sau verifică
                                    filtrele de raportare.
                                </div>
                            )}
                        </div>
                    </article>
                </section>

                <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-berkeley">Indicatori suplimentari</h2>
                            <p className="text-sm text-slate-500">
                                Monitorizează cheltuielile și marja de profit pentru a evalua sustenabilitatea financiară.
                            </p>
                        </div>
                        <div className="flex gap-6 text-sm text-slate-600">
                            <div>
                                <span className="block text-xs uppercase tracking-wide text-slate-400">Cheltuieli</span>
                                <span className="text-base font-semibold text-berkeley">
                                    {currencyFormatter.format(summary?.total_expenses ?? 0)}
                                </span>
                            </div>
                            <div>
                                <span className="block text-xs uppercase tracking-wide text-slate-400">Marjă profit</span>
                                <span className="text-base font-semibold text-berkeley">
                                    {revenue > 0
                                        ? percentFormatter.format(netProfit / revenue)
                                        : percentFormatter.format(0)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">
                        Datele sunt actualizate automat prin SWR, iar reîmprospătarea manuală îți oferă control complet în
                        momentele cheie de raportare financiară.
                    </p>
                </section>
            </div>
        </div>
    );
}
