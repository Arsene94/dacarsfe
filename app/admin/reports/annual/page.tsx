"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { ArrowDownRight, ArrowUpRight, BarChart3, RefreshCw, Users } from "lucide-react";
import apiClient from "@/lib/api";
import type { AdminReportAnnualResponse } from "@/types/reports";
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
  { value: "previous_year", label: "Anul precedent" },
  { value: "custom", label: "An personalizat" },
] as const;

const buildYearOptions = () => {
  const options: string[] = [];
  const now = new Date();
  let year = now.getFullYear();
  for (let i = 0; i < 6; i += 1) {
    options.push(String(year - i));
  }
  return options;
};

const yearOptions = buildYearOptions();

export default function AdminAnnualReportPage() {
  const [data, setData] = useState<AdminReportAnnualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<{
    year: string;
    compareWith: "previous_year" | "custom";
    customYear: string;
  }>({ year: "", compareWith: "previous_year", customYear: "" });
  const [formYear, setFormYear] = useState("");
  const [formCompareWith, setFormCompareWith] = useState<"previous_year" | "custom">(
    "previous_year",
  );
  const [formCustomYear, setFormCustomYear] = useState("");

  const loadData = useCallback(async () => {
    if (!query.year) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchAdminReportAnnual({
        year: query.year,
        compare_with: query.compareWith,
        custom_compare:
          query.compareWith === "custom" && query.customYear
            ? query.customYear
            : undefined,
      });
      setData(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nu am putut încărca raportul anual.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query.compareWith, query.customYear, query.year]);

  useEffect(() => {
    if (!query.year) {
      const option = yearOptions[0] ?? String(new Date().getFullYear());
      setFormYear(option);
      setQuery((prev) => ({ ...prev, year: option }));
      return;
    }
    void loadData();
  }, [loadData, query.year]);

  useEffect(() => {
    if (!data) {
      return;
    }
    setFormYear(data.period.year);
    setFormCompareWith(query.compareWith);
    if (query.compareWith === "custom" && data.period.comparison.year) {
      setFormCustomYear(data.period.comparison.year);
    }
  }, [data, query.compareWith]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery({
        year: formYear,
        compareWith: formCompareWith,
        customYear: formCustomYear,
      });
    },
    [formCompareWith, formCustomYear, formYear],
  );

  const handleReset = useCallback(() => {
    if (data) {
      setFormYear(data.period.year);
      setFormCustomYear(data.period.comparison.year);
    }
    setFormCompareWith("previous_year");
    setQuery({
      year: data?.period.year ?? formYear,
      compareWith: "previous_year",
      customYear: data?.period.comparison.year ?? "",
    });
  }, [data, formYear]);

  const quarterTrend = useMemo<ChartData<"line"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.quarter_breakdown.map((item) => item.label),
      datasets: [
        {
          label: data.period.label,
          data: data.quarter_breakdown.map((item) => item.revenue.current),
          borderColor: getColor("primary"),
          backgroundColor: "rgba(26, 54, 97, 0.2)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
        },
        {
          label: data.period.comparison.label,
          data: data.quarter_breakdown.map((item) => item.revenue.previous),
          borderColor: getColor("accentLight"),
          backgroundColor: "rgba(56, 178, 117, 0.2)",
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    } satisfies ChartData<"line">;
  }, [data]);

  const quarterTrendOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currency = data?.executive_summary.currency ?? "EUR";
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

  const segmentPerformanceData = useMemo<ChartData<"bar"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.segment_performance.segments.map((item) => item.segment),
      datasets: [
        {
          label: data.period.label,
          data: data.segment_performance.segments.map((item) => item.revenue.current),
          backgroundColor: getColor("primary"),
          borderRadius: 12,
        },
        {
          label: data.period.comparison.label,
          data: data.segment_performance.segments.map((item) => item.revenue.previous),
          backgroundColor: getColor("accentLight"),
          borderRadius: 12,
        },
      ],
    } satisfies ChartData<"bar">;
  }, [data]);

  const segmentPerformanceOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currency = data?.executive_summary.currency ?? "EUR";
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

  const channelMixData = useMemo<ChartData<"doughnut"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.channel_performance.mix.map((item) => item.label),
      datasets: [
        {
          data: data.channel_performance.mix.map((item) => item.current_percent),
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

  const channelMixOptions = useMemo<ChartOptions<"doughnut">>(
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

  const cityPerformanceData = useMemo<ChartData<"bar"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.city_performance.top_cities.map((item) => item.city),
      datasets: [
        {
          label: data.period.label,
          data: data.city_performance.top_cities.map((item) => item.current),
          backgroundColor: getColor("primary"),
          borderRadius: 12,
        },
        {
          label: data.period.comparison.label,
          data: data.city_performance.top_cities.map((item) => item.previous),
          backgroundColor: getColor("accentLight"),
          borderRadius: 12,
        },
      ],
    } satisfies ChartData<"bar">;
  }, [data]);

  const cityPerformanceOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: "#E2E8F0" },
          ticks: {
            callback: (value) => {
              if (typeof value === "number") {
                return `${value}`;
              }
              return value;
            },
          },
        },
      },
    }),
    [],
  );

  const dominantChannel = useMemo(() => data?.channel_performance.dominant_channel ?? null, [data]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-berkeley">Raport anual</h1>
        <p className="text-sm text-slate-600">
          Vizualizează performanța anuală și insight-urile strategice.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="year-select">
              An analizat
            </label>
            <Select
              id="year-select"
              value={formYear}
              onValueChange={(value) => setFormYear(value)}
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="year-compare">
              Comparație
            </label>
            <Select
              id="year-compare"
              value={formCompareWith}
              onValueChange={(value) => setFormCompareWith(value as "previous_year" | "custom")}
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
              <label className="text-sm font-medium text-slate-600" htmlFor="custom-year">
                An comparație
              </label>
              <Input
                id="custom-year"
                type="number"
                min="2000"
                max="2100"
                value={formCustomYear}
                onChange={(event) => setFormCustomYear(event.target.value)}
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
              title="Venit total"
              value={formatCurrency(data.executive_summary.revenue.current, data.executive_summary.currency)}
              subtitle={data.period.label}
              {...describeRelativeChange(
                data.executive_summary.revenue.current,
                data.executive_summary.revenue.previous,
                data.period.comparison.label,
              )}
            />
            <MetricCard
              title="Profit net"
              value={formatCurrency(data.executive_summary.net_profit.current, data.executive_summary.currency)}
              subtitle="După toate costurile"
              {...describeRelativeChange(
                data.executive_summary.net_profit.current,
                data.executive_summary.net_profit.previous,
                data.period.comparison.label,
              )}
            />
            <MetricCard
              title="Rezervări"
              value={`${data.executive_summary.bookings.current}`}
              subtitle="Total anual"
              {...describeRelativeChange(
                data.executive_summary.bookings.current,
                data.executive_summary.bookings.previous,
                data.period.comparison.label,
              )}
            />
            <MetricCard
              title="ADR"
              value={formatCurrency(
                data.executive_summary.average_daily_rate.current,
                data.executive_summary.currency,
              )}
              subtitle="Tarif mediu zilnic"
              {...describeRelativeChange(
                data.executive_summary.average_daily_rate.current,
                data.executive_summary.average_daily_rate.previous,
                data.period.comparison.label,
              )}
            />
          </StatGrid>

          <ReportSection
            title="Evoluție trimestrială a veniturilor"
            description="Compară dinamica fiecărui trimestru cu anul de referință."
          >
            <ChartContainer>
              {quarterTrend ? <Line options={quarterTrendOptions} data={quarterTrend} /> : null}
            </ChartContainer>
          </ReportSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              title="Performanță pe segmente"
              description="Veniturile pe segmente de flotă și evoluția YoY."
            >
              <ChartContainer heightClass="h-80">
                {segmentPerformanceData ? (
                  <Bar options={segmentPerformanceOptions} data={segmentPerformanceData} />
                ) : null}
              </ChartContainer>
              <div className="grid gap-2 pt-4 text-sm text-slate-600">
                {data.segment_performance.segments.map((segment) => (
                  <div key={segment.segment} className="flex justify-between">
                    <span>{segment.segment}</span>
                    <span className="font-medium text-berkeley">
                      {formatPercent(segment.net_profit.growth_ratio)} YoY
                    </span>
                  </div>
                ))}
              </div>
            </ReportSection>

            <ReportSection
              title="Mix de canale"
              description="Canalele dominante și variațiile YoY."
            >
              <ChartContainer heightClass="h-80">
                {channelMixData ? (
                  <Doughnut options={channelMixOptions} data={channelMixData} />
                ) : null}
              </ChartContainer>
              <div className="grid gap-2 pt-4 text-sm text-slate-600">
                {data.channel_performance.year_over_year.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        item.delta_percent >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {item.delta_percent >= 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {item.delta_percent >= 0 ? "+" : ""}
                      {item.delta_percent}%
                    </span>
                  </div>
                ))}
              </div>
              {dominantChannel ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  Canal dominant: {dominantChannel.label} – {dominantChannel.current_percent}%
                  ({dominantChannel.delta_percent >= 0 ? "+" : ""}
                  {dominantChannel.delta_percent}% YoY)
                </div>
              ) : null}
            </ReportSection>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              title="Orașe cu volum ridicat"
              description="Compară performanța orașelor principale."
            >
              <ChartContainer heightClass="h-80">
                {cityPerformanceData ? (
                  <Bar options={cityPerformanceOptions} data={cityPerformanceData} />
                ) : null}
              </ChartContainer>
              <div className="grid gap-2 pt-4 text-sm text-slate-600">
                {data.city_performance.growth_leaders.map((city) => (
                  <div key={city.city} className="flex justify-between">
                    <span>{city.city}</span>
                    <span className="font-medium text-berkeley">
                      {formatPercent(city.growth_ratio)} creștere
                    </span>
                  </div>
                ))}
              </div>
            </ReportSection>

            <ReportSection
              title="Insight-uri despre clienți"
              description="Analizează retenția și contribuția clienților noi."
            >
              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <Users className="h-4 w-4 text-jade" /> Segmentare
                  </h3>
                  <p className="text-sm text-slate-700">
                    Clienți noi: {data.customer_insights.new_customers.unique} ({formatCurrency(
                      data.customer_insights.new_customers.revenue,
                      data.executive_summary.currency,
                    )})
                  </p>
                  <p className="text-sm text-slate-700">
                    Clienți recurenți: {data.customer_insights.repeat_customers.unique} ({formatCurrency(
                      data.customer_insights.repeat_customers.revenue,
                      data.executive_summary.currency,
                    )})
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Valoare medie rezervare recurenți: {formatCurrency(
                      data.customer_insights.average_repeat_booking_value,
                      data.executive_summary.currency,
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold text-slate-600">Retenție și conversie</h3>
                  <p className="mt-2 text-2xl font-semibold text-berkeley">
                    {formatPercent(data.customer_insights.repeat_ratio)} rata de retenție
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Contribuție la venit: {formatPercent(data.customer_insights.repeat_revenue_share)}
                  </p>
                </div>
              </div>
            </ReportSection>
          </div>

          <ReportSection
            title="Sănătate operațională"
            description="Monitorizează indicatorii cheie de calitate."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-600">Rată anulări</h3>
                <p className="mt-2 text-2xl font-semibold text-berkeley">
                  {formatPercent(data.operational_health.cancellations.current_rate)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {data.operational_health.cancellations.current_count} anulări vs {data.operational_health.cancellations.previous_count} anul trecut
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-600">Durată medie închiriere</h3>
                <p className="mt-2 text-2xl font-semibold text-berkeley">
                  {data.operational_health.average_rental_duration_days.current.toFixed(1)} zile
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  (anterior {data.operational_health.average_rental_duration_days.previous.toFixed(1)} zile)
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-600">Utilizare flotă</h3>
                <p className="mt-2 text-2xl font-semibold text-berkeley">
                  {formatPercent(data.operational_health.fleet_utilization.current)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  (anterior {formatPercent(data.operational_health.fleet_utilization.previous)})
                </p>
              </div>
            </div>
          </ReportSection>

          <ReportSection
            title="Recomandări strategice"
            description="Planifică inițiative pentru anul următor."
          >
            <InsightList items={data.strategic_recommendations} icon={<BarChart3 className="h-4 w-4" />} />
          </ReportSection>
        </div>
      ) : null}
    </div>
  );
}
