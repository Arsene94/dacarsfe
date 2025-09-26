"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
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
import {
  BarChart,
  DoughnutChart,
  LineChart,
} from "@/components/admin/reports/ChartPrimitives";
import "@/components/admin/reports/chartSetup";
import { getColor } from "@/components/admin/reports/chartSetup";

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);

const formatPercent = (value: number, fractionDigits = 1) =>
  `${(value * 100).toFixed(fractionDigits)}%`;

const describeRelativeChange = (
  current: number,
  previous: number,
  context: string,
) => {
  if (previous === 0) {
    if (current === 0) {
      return {
        trend: "neutral" as const,
        trendLabel: `Neschimbat față de ${context}`,
      };
    }
    return { trend: "up" as const, trendLabel: `Creștere față de ${context}` };
  }

  const delta = current - previous;
  const ratio = delta / Math.abs(previous);
  if (!Number.isFinite(ratio) || Math.abs(ratio) < 0.0001) {
    return { trend: "neutral" as const, trendLabel: `În linie cu ${context}` };
  }
  const percent = (ratio * 100).toFixed(1);
  const trend = ratio > 0 ? "up" : ratio < 0 ? "down" : "neutral";
  const sign = ratio > 0 ? "+" : "";
  return { trend, trendLabel: `${sign}${percent}% față de ${context}` };
};

const comparisonOptions = [
  { value: "previous_month", label: "Luna anterioară" },
  { value: "same_month_last_year", label: "Aceeași lună a anului trecut" },
  { value: "custom", label: "Lună personalizată" },
] as const;

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

  const trendData = useMemo<ChartData<"line"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.six_month_trend.map((item) => item.label),
      datasets: [
        {
          label: "Venituri",
          data: data.six_month_trend.map((item) => item.revenue),
          borderColor: getColor("primary"),
          backgroundColor: "rgba(26, 54, 97, 0.25)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
        },
        {
          label: "Profit",
          data: data.six_month_trend.map((item) => item.profit),
          borderColor: getColor("accentLight"),
          backgroundColor: "rgba(56, 178, 117, 0.25)",
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    } satisfies ChartData<"line">;
  }, [data]);

  const trendOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currency = data?.financials.currency ?? "EUR";
              const value = context.raw as number;
              return `${context.dataset.label}: ${formatCurrency(value, currency)}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: "#E2E8F0" },
          ticks: {
            callback: (value) => {
              if (typeof value === "number") {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value;
            },
          },
        },
      },
    }),
    [data],
  );

  const customerMixData = useMemo<ChartData<"doughnut"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.customer_mix.map((item) => item.label),
      datasets: [
        {
          data: data.customer_mix.map((item) => item.current_percent),
          backgroundColor: [
            getColor("primary"),
            getColor("accent"),
            getColor("info"),
            getColor("neutral"),
          ],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    } satisfies ChartData<"doughnut">;
  }, [data]);

  const customerMixOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${context.raw}%`,
          },
        },
      },
    }),
    [],
  );

  const costStructureData = useMemo<ChartData<"bar"> | null>(() => {
    if (!data) {
      return null;
    }
    const costs = [
      { label: "Flotă", value: data.cost_structure.fleet.current, previous: data.cost_structure.fleet.previous },
      { label: "Operațiuni", value: data.cost_structure.operations.current, previous: data.cost_structure.operations.previous },
      { label: "Marketing", value: data.cost_structure.marketing.current, previous: data.cost_structure.marketing.previous },
      { label: "Alte costuri", value: data.cost_structure.other.current, previous: data.cost_structure.other.previous },
    ];
    return {
      labels: costs.map((item) => item.label),
      datasets: [
        {
          label: data.period.label,
          data: costs.map((item) => item.value),
          backgroundColor: getColor("primary"),
          borderRadius: 10,
        },
        {
          label: data.period.comparison.label,
          data: costs.map((item) => item.previous),
          backgroundColor: getColor("accentLight"),
          borderRadius: 10,
        },
      ],
    } satisfies ChartData<"bar">;
  }, [data]);

  const costStructureOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currency = data?.financials.currency ?? "EUR";
              const value = context.raw as number;
              return `${context.dataset.label}: ${formatCurrency(value, currency)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#E2E8F0" },
          ticks: {
            callback: (value) => {
              if (typeof value === "number") {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value;
            },
          },
        },
        y: { grid: { display: false } },
      },
    }),
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
                <LineChart options={trendOptions} data={trendData} />
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
                  <DoughnutChart options={customerMixOptions} data={customerMixData} />
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
                  <BarChart options={costStructureOptions} data={costStructureData} />
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
