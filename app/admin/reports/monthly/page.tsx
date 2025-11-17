"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, RefreshCw, Target } from "lucide-react";
import apiClient from "@/lib/api";
import type { AdminReportMonthlyResponse } from "@/types/reports";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  InsightList,
  MetricCard,
  ReportSection,
  StatGrid,
} from "@/components/admin/reports/ReportElements";
import type {
  BarSeries,
  DoughnutSlice,
  LineSeries,
} from "@/components/admin/reports/ChartPrimitives";
import {
  DoughnutChart,
  LineChart,
  SimpleBarChart,
} from "@/components/admin/reports/ChartPrimitives";
import { getColor } from "@/components/admin/reports/chartSetup";
import {
  formatCurrency,
  formatSecondaryCurrency,
} from "@/components/admin/reports/formatting";
import { describeRelativeChange } from "@/components/admin/reports/trends";

const formatPercent = (value: number, fractionDigits = 1) =>
  `${(value * 100).toFixed(fractionDigits)}%`;

const comparisonOptions = [
  { value: "previous_month", label: "Luna anterioară" },
  { value: "same_month_last_year", label: "Aceeași lună a anului trecut" },
  { value: "custom", label: "Lună personalizată" },
] as const;

const buildSecondaryFootnote = (value?: number | null, currency?: string) => {
  const formatted = formatSecondaryCurrency(value, currency);
  return formatted ? `≈ ${formatted}` : undefined;
};

export default function AdminMonthlyReportPage() {
  const [data, setData] = useState<AdminReportMonthlyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<{
    month: string;
    compareWith: "previous_month" | "same_month_last_year" | "custom";
    customCompare: string;
  }>({ month: "", compareWith: "previous_month", customCompare: "" });
  const [formMonth, setFormMonth] = useState("");
  const [formCompareWith, setFormCompareWith] = useState<
    "previous_month" | "same_month_last_year" | "custom"
  >("previous_month");
  const [formCustomMonth, setFormCustomMonth] = useState("");

  const loadData = useCallback(async () => {
    if (!query.month) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchAdminReportMonthly({
        month: query.month,
        compare_with: query.compareWith,
        custom_compare:
          query.compareWith === "custom" && query.customCompare
            ? query.customCompare
            : undefined,
      });
      setData(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nu am putut încărca raportul lunar.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query.compareWith, query.customCompare, query.month]);

  useEffect(() => {
    if (!query.month) {
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      setFormMonth(iso);
      setQuery((prev) => ({ ...prev, month: iso }));
      return;
    }
    void loadData();
  }, [loadData, query.month]);

  useEffect(() => {
    if (!data) {
      return;
    }
    setFormMonth(data.period.month);
    setFormCompareWith(query.compareWith);
    if (query.compareWith === "custom" && data.period.comparison.month) {
      setFormCustomMonth(data.period.comparison.month);
    }
  }, [data, query.compareWith]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery({
        month: formMonth,
        compareWith: formCompareWith,
        customCompare: formCustomMonth,
      });
    },
    [formCompareWith, formCustomMonth, formMonth],
  );

  const handleReset = useCallback(() => {
    if (data) {
      setFormMonth(data.period.month);
      setFormCustomMonth(data.period.comparison.month);
    }
    setFormCompareWith("previous_month");
    setQuery({
      month: data?.period.month ?? formMonth,
      compareWith: "previous_month",
      customCompare: data?.period.comparison.month ?? "",
    });
  }, [data, formMonth]);

  const formatThousands = useCallback((value: number | string) => {
    if (typeof value !== "number") {
      return value;
    }
    if (Math.abs(value) < 1000) {
      return value.toLocaleString("ro-RO", { maximumFractionDigits: 0 });
    }
    return `${(value / 1000).toFixed(0)}k`;
  }, []);

  const trendData = useMemo(() => {
    if (!data) {
      return null;
    }
    return data.six_month_trend.map((item) => ({
      label: item.label,
      revenue: item.revenue,
      profit: item.profit,
      revenue_ron: item.revenue_ron,
      profit_ron: item.profit_ron,
    }));
  }, [data]);

  const trendSeries = useMemo<LineSeries[]>(
    () =>
      data
        ? [
            {
              dataKey: "revenue",
              name: "Venituri",
              color: getColor("primary"),
              fillOpacity: 0.25,
            },
            {
              dataKey: "profit",
              name: "Profit",
              color: getColor("accentLight"),
              fillOpacity: 0.2,
            },
          ]
        : [],
    [data],
  );

  const customerMixData = useMemo<DoughnutSlice[] | null>(() => {
    if (!data) {
      return null;
    }
    const colors = [
      getColor("primary"),
      getColor("accent"),
      getColor("info"),
      getColor("neutral"),
    ];
    return data.customer_mix.map((item, index) => ({
      name: item.label,
      value: item.current_percent,
      color: colors[index % colors.length],
      previousPercent: item.previous_percent,
    }));
  }, [data]);

  const costStructureData = useMemo(() => {
    if (!data) {
      return null;
    }
    return [
      {
        label: "Flotă",
        current: data.cost_structure.fleet.current,
        previous: data.cost_structure.fleet.previous,
        current_ron: data.cost_structure.fleet.current_ron,
        previous_ron: data.cost_structure.fleet.previous_ron,
      },
      {
        label: "Operațiuni",
        current: data.cost_structure.operations.current,
        previous: data.cost_structure.operations.previous,
        current_ron: data.cost_structure.operations.current_ron,
        previous_ron: data.cost_structure.operations.previous_ron,
      },
      {
        label: "Marketing",
        current: data.cost_structure.marketing.current,
        previous: data.cost_structure.marketing.previous,
        current_ron: data.cost_structure.marketing.current_ron,
        previous_ron: data.cost_structure.marketing.previous_ron,
      },
      {
        label: "Alte costuri",
        current: data.cost_structure.other.current,
        previous: data.cost_structure.other.previous,
        current_ron: data.cost_structure.other.current_ron,
        previous_ron: data.cost_structure.other.previous_ron,
      },
    ];
  }, [data]);

  const costStructureSeries = useMemo<BarSeries[]>(
    () =>
      data
        ? [
            {
              dataKey: "current",
              name: data.period.label,
              color: getColor("primary"),
              radius: 10,
            },
            {
              dataKey: "previous",
              name: data.period.comparison.label,
              color: getColor("accentLight"),
              radius: 10,
            },
          ]
        : [],
    [data],
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-berkeley">Raport lunar</h1>
        <p className="text-sm text-slate-600">
          Analizează rezultatele lunii selectate și comparația cu perioada de referință.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="month">
              Lună analizată
            </label>
            <Input
              id="month"
              type="month"
              value={formMonth}
              onChange={(event) => setFormMonth(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="monthly-compare">
              Comparație
            </label>
            <Select
              id="monthly-compare"
              value={formCompareWith}
              onValueChange={(value) =>
                setFormCompareWith(
                  value as "previous_month" | "same_month_last_year" | "custom",
                )
              }
            >
              {comparisonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {formCompareWith === "custom" ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600" htmlFor="custom-month">
                Lună comparație
              </label>
              <Input
                id="custom-month"
                type="month"
                value={formCustomMonth}
                onChange={(event) => setFormCustomMonth(event.target.value)}
                required
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">Perioadă de referință</label>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                {data?.period.comparison.label ?? "--"}
              </div>
            </div>
          )}
          <div className="flex items-end gap-3">
            <Button type="submit" className="bg-jade px-6 text-white" disabled={loading}>
              Actualizează
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Resetează
            </Button>
          </div>
        </form>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Se încarcă raportul...
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <StatGrid>
            <MetricCard
              title="Venituri"
              value={formatCurrency(data.financials.revenue.current, data.financials.currency)}
              subtitle={data.period.label}
              {...describeRelativeChange(
                data.financials.revenue.current,
                data.financials.revenue.previous,
                data.period.comparison.label,
              )}
              footer={buildSecondaryFootnote(
                data.financials.revenue.current_ron,
                data.financials.currency_secondary,
              )}
            />
            <MetricCard
              title="Profit net"
              value={formatCurrency(data.financials.net_profit.current, data.financials.currency)}
              subtitle="Marjă după costuri"
              {...describeRelativeChange(
                data.financials.net_profit.current,
                data.financials.net_profit.previous,
                data.period.comparison.label,
              )}
              footer={buildSecondaryFootnote(
                data.financials.net_profit.current_ron,
                data.financials.currency_secondary,
              )}
            />
            <MetricCard
              title="Tarif mediu zilnic"
              value={formatCurrency(data.financials.avg_daily_rate.current, data.financials.currency)}
              subtitle="ADR"
              {...describeRelativeChange(
                data.financials.avg_daily_rate.current,
                data.financials.avg_daily_rate.previous,
                data.period.comparison.label,
              )}
              footer={buildSecondaryFootnote(
                data.financials.avg_daily_rate.current_ron,
                data.financials.currency_secondary,
              )}
            />
            <MetricCard
              title="Utilizare flotă"
              value={formatPercent(data.financials.fleet_utilization.current)}
              subtitle="Grad mediu de ocupare"
              {...describeRelativeChange(
                data.financials.fleet_utilization.current,
                data.financials.fleet_utilization.previous,
                data.period.comparison.label,
              )}
            />
          </StatGrid>

          <ReportSection
            title="Trend 6 luni"
            description="Evaluează traiectoria veniturilor și a profitului."
          >
            <ChartContainer>
              {trendData ? (
                <LineChart
                  data={trendData}
                  xKey="label"
                  series={trendSeries}
                  yTickFormatter={formatThousands}
                  valueFormatter={(value, name, payload) => {
                    const base = formatCurrency(value, data.financials.currency);
                    const record = (payload as Record<string, unknown>) ?? {};
                    let ronValue: number | undefined;
                    if (
                      typeof record.revenue === "number" &&
                      record.revenue === value
                    ) {
                      ronValue = record.revenue_ron as number | undefined;
                    } else if (
                      typeof record.profit === "number" &&
                      record.profit === value
                    ) {
                      ronValue = record.profit_ron as number | undefined;
                    }
                    const secondary = formatSecondaryCurrency(
                      ronValue,
                      data.financials.currency_secondary,
                    );
                    return secondary
                      ? `${name}: ${base} (${secondary})`
                      : `${name}: ${base}`;
                  }}
                />
              ) : null}
            </ChartContainer>
          </ReportSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              title="Mix de clienți"
              description="Ponderea rezervărilor pe segmente de clienți."
            >
              <ChartContainer heightClass="h-80">
                {customerMixData ? (
                  <DoughnutChart
                    data={customerMixData}
                    valueFormatter={(value, name, payload) => {
                      const previous = payload?.previousPercent;
                      return previous !== undefined
                        ? `${name}: ${value}% (anterior ${previous}%)`
                        : `${name}: ${value}%`;
                    }}
                  />
                ) : null}
              </ChartContainer>
              <div className="grid gap-2 pt-4 text-sm text-slate-600">
                {data.customer_mix.map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span>{item.label}</span>
                    <span className="font-medium text-berkeley">
                      {item.current_percent}%
                      <span className="ml-1 text-xs text-slate-500">
                        (anterior {item.previous_percent}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </ReportSection>

            <ReportSection
              title="Structură de costuri"
              description="Comparație între luna curentă și perioada de referință."
            >
              <ChartContainer heightClass="h-80">
                {costStructureData ? (
                  <SimpleBarChart
                    data={costStructureData}
                    xKey="label"
                    series={costStructureSeries}
                    layout="vertical"
                    yTickFormatter={formatThousands}
                    valueFormatter={(value, name, payload) => {
                      const base = formatCurrency(value, data.financials.currency);
                      const record = (payload as Record<string, unknown>) ?? {};
                      let ronValue: number | undefined;
                      if (
                        typeof record.current === "number" &&
                        record.current === value
                      ) {
                        ronValue = record.current_ron as number | undefined;
                      } else if (
                        typeof record.previous === "number" &&
                        record.previous === value
                      ) {
                        ronValue = record.previous_ron as number | undefined;
                      }
                      const secondary = formatSecondaryCurrency(
                        ronValue,
                        data.financials.currency_secondary,
                      );
                      return secondary
                        ? `${name}: ${base} (${secondary})`
                        : `${name}: ${base}`;
                    }}
                  />
                ) : null}
              </ChartContainer>
            </ReportSection>
          </div>

          <ReportSection
            title="Rezervări și orașe cheie"
            description="Concentrează eforturile comerciale pe piețele cu creștere."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-600">Total rezervări</h3>
                <p className="mt-2 text-2xl font-semibold text-berkeley">
                  {data.bookings.total.current}
                  <span className="ml-2 text-xs text-slate-500">
                    (anterior {data.bookings.total.previous})
                  </span>
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Pondere corporate: {formatPercent(data.bookings.corporate_share.current)}
                  <span className="ml-1 text-xs text-slate-500">
                    (anterior {formatPercent(data.bookings.corporate_share.previous)})
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Building2 className="h-4 w-4 text-jade" /> Orașe cu volum ridicat
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {data.bookings.top_cities.map((city) => (
                    <li key={city.city} className="flex justify-between">
                      <span>{city.city}</span>
                      <span className="font-medium text-berkeley">
                        {city.current}
                        <span className="ml-1 text-xs text-slate-500">
                          (anterior {city.previous})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </ReportSection>

          <ReportSection
            title="Zone de focus"
            description="Direcții tactice pentru luna următoare."
          >
            <InsightList items={data.focus_areas} icon={<Target className="h-4 w-4" />} />
          </ReportSection>
        </div>
      ) : null}
    </div>
  );
}
