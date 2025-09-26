"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Doughnut, Line, Radar } from "react-chartjs-2";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api";
import type { AdminReportWeeklyResponse } from "@/types/reports";
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
  { value: "previous_week", label: "Săptămâna precedentă" },
  { value: "same_week_last_year", label: "Aceeași săptămână a anului trecut" },
  { value: "custom", label: "Interval personalizat" },
] as const;

export default function AdminWeeklyReportPage() {
  const [data, setData] = useState<AdminReportWeeklyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<{
    start: string;
    compareWith: "previous_week" | "same_week_last_year" | "custom";
    customStart: string;
  }>({ start: "", compareWith: "previous_week", customStart: "" });
  const [formStart, setFormStart] = useState("");
  const [formCompareWith, setFormCompareWith] = useState<
    "previous_week" | "same_week_last_year" | "custom"
  >("previous_week");
  const [formCustomStart, setFormCustomStart] = useState("");

  const loadData = useCallback(async () => {
    if (!query.start) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchAdminReportWeekly({
        start_date: query.start,
        compare_with: query.compareWith,
        custom_compare_start:
          query.compareWith === "custom" && query.customStart
            ? query.customStart
            : undefined,
      });
      setData(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nu am putut încărca raportul săptămânal.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query.compareWith, query.customStart, query.start]);

  useEffect(() => {
    if (!query.start) {
      const today = new Date();
      const day = today.getDay();
      const diff = (day + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diff);
      const iso = monday.toISOString().slice(0, 10);
      setFormStart(iso);
      setQuery((prev) => ({ ...prev, start: iso }));
      return;
    }
    void loadData();
  }, [loadData, query.start]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (!formStart) {
      setFormStart(data.period.start);
    }
    setFormCompareWith(query.compareWith);
    if (query.compareWith === "custom" && data.period.comparison_start) {
      setFormCustomStart(data.period.comparison_start);
    }
  }, [data, formStart, query.compareWith]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery({
        start: formStart,
        compareWith: formCompareWith,
        customStart: formCustomStart,
      });
    },
    [formCompareWith, formCustomStart, formStart],
  );

  const handleReset = useCallback(() => {
    if (data) {
      setFormStart(data.period.start);
      setFormCustomStart(data.period.comparison_start);
    }
    setFormCompareWith("previous_week");
    setQuery({
      start: data?.period.start ?? formStart,
      compareWith: "previous_week",
      customStart: data?.period.comparison_start ?? "",
    });
  }, [data, formStart]);

  const comparisonLabel = useMemo(() => {
    if (!data) {
      return "intervalul de referință";
    }
    return `${data.period.comparison_start} – ${data.period.comparison_end}`;
  }, [data]);

  const revenueChart = useMemo<ChartData<"line"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.daily_revenue.map((point) => point.label),
      datasets: [
        {
          label: "Venit curent",
          data: data.daily_revenue.map((point) => point.current),
          borderColor: getColor("primary"),
          backgroundColor: "rgba(26, 54, 97, 0.25)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
        },
        {
          label: "Venit comparație",
          data: data.daily_revenue.map((point) => point.previous),
          borderColor: getColor("accentLight"),
          backgroundColor: "rgba(56, 178, 117, 0.2)",
          borderDash: [6, 4],
          tension: 0.25,
          pointRadius: 4,
        },
      ],
    } satisfies ChartData<"line">;
  }, [data]);

  const revenueChartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currency = data?.totals.currency ?? "EUR";
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

  const channelMixData = useMemo<ChartData<"doughnut"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.channel_mix.map((item) => item.label),
      datasets: [
        {
          label: "Canal curent",
          data: data.channel_mix.map((item) => item.current_percent),
          backgroundColor: [
            getColor("primary"),
            getColor("accent"),
            getColor("info"),
            getColor("neutral"),
          ],
          borderColor: "#ffffff",
          borderWidth: 2,
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
            label: (context) => {
              const value = context.raw as number;
              return `${context.label}: ${value}%`;
            },
          },
        },
      },
    }),
    [],
  );

  const occupancyData = useMemo<ChartData<"radar"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.occupancy_by_segment.map((item) => item.label),
      datasets: [
        {
          label: "Ocupare curentă",
          data: data.occupancy_by_segment.map((item) => item.current * 100),
          borderColor: getColor("primary"),
          backgroundColor: "rgba(26, 54, 97, 0.2)",
          pointBackgroundColor: getColor("primary"),
        },
        {
          label: "Referință",
          data: data.occupancy_by_segment.map((item) => item.previous * 100),
          borderColor: getColor("accentLight"),
          backgroundColor: "rgba(56, 178, 117, 0.2)",
          pointBackgroundColor: getColor("accentLight"),
        },
      ],
    } satisfies ChartData<"radar">;
  }, [data]);

  const occupancyOptions = useMemo<ChartOptions<"radar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`,
            stepSize: 20,
          },
          grid: { color: "rgba(100, 116, 139, 0.2)" },
          angleLines: { color: "rgba(100, 116, 139, 0.25)" },
        },
      },
      plugins: {
        legend: { position: "bottom" },
      },
    }),
    [],
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-berkeley">Raport săptămânal</h1>
        <p className="text-sm text-slate-600">
          Analizează performanța pe ultimele 7 zile și compară cu {comparisonLabel}.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          className="grid gap-4 md:grid-cols-4"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="weekly-start">
              Luni analizată
            </label>
            <Input
              id="weekly-start"
              type="date"
              value={formStart}
              onChange={(event) => setFormStart(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="compare-with">
              Comparație
            </label>
            <Select
              id="compare-with"
              value={formCompareWith}
              onValueChange={(value) =>
                setFormCompareWith(
                  value as "previous_week" | "same_week_last_year" | "custom",
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
              <label className="text-sm font-medium text-slate-600" htmlFor="custom-start">
                Luni comparație
              </label>
              <Input
                id="custom-start"
                type="date"
                value={formCustomStart}
                onChange={(event) => setFormCustomStart(event.target.value)}
                required
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-600">Interval comparație</label>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                {comparisonLabel}
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
              value={formatCurrency(data.totals.revenue.current, data.totals.currency)}
              subtitle={`${data.period.start} – ${data.period.end}`}
              {...describeRelativeChange(
                data.totals.revenue.current,
                data.totals.revenue.previous,
                comparisonLabel,
              )}
            />
            <MetricCard
              title="Rezervări"
              value={`${data.totals.bookings.current}`}
              subtitle="Confirmate în perioada analizată"
              {...describeRelativeChange(
                data.totals.bookings.current,
                data.totals.bookings.previous,
                comparisonLabel,
              )}
            />
            <MetricCard
              title="Anulări"
              value={`${data.totals.cancellations.current}`}
              subtitle="Comenzi pierdute"
              {...describeRelativeChange(
                data.totals.cancellations.current,
                data.totals.cancellations.previous,
                comparisonLabel,
              )}
            />
            <MetricCard
              title="Durată medie"
              value={`${data.totals.average_duration_days.current.toFixed(1)} zile`}
              subtitle="Număr mediu de zile / rezervare"
              {...describeRelativeChange(
                data.totals.average_duration_days.current,
                data.totals.average_duration_days.previous,
                comparisonLabel,
              )}
              footer={`YoY venit: ${(data.totals.yoy.revenue_ratio * 100).toFixed(1)}%`}
            />
          </StatGrid>

          <ReportSection
            title="Evoluție zilnică a veniturilor"
            description="Compară trendul zilnic cu intervalul de referință."
          >
            <ChartContainer>
              {revenueChart ? <Line options={revenueChartOptions} data={revenueChart} /> : null}
            </ChartContainer>
          </ReportSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              title="Mix de canale"
              description="Distribuția rezervărilor pe canale comparativ cu perioada de referință."
            >
              <ChartContainer heightClass="h-80">
                {channelMixData ? (
                  <Doughnut options={channelMixOptions} data={channelMixData} />
                ) : null}
              </ChartContainer>
              <div className="grid gap-2 pt-4 text-sm text-slate-600">
                {data.channel_mix.map((item) => (
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
              title="Ocupare pe segmente"
              description="Compară gradul de utilizare pentru fiecare segment de flotă."
            >
              <ChartContainer heightClass="h-80">
                {occupancyData ? (
                  <Radar options={occupancyOptions} data={occupancyData} />
                ) : null}
              </ChartContainer>
            </ReportSection>
          </div>

          <ReportSection
            title="Indicatori de risc"
            description="Monitorizează comportamentele care pot afecta profitabilitatea."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-600">Rată de anulare</h3>
                <p className="mt-2 text-2xl font-semibold text-berkeley">
                  {formatPercent(data.risk_indicators.cancellation_rate, 1)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Mențineți sub 8% pentru a proteja marjele.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-600">Retururi întârziate</h3>
                <p className="mt-2 text-2xl font-semibold text-berkeley">
                  {data.risk_indicators.late_returns_count}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Impact estimat: {formatCurrency(data.risk_indicators.late_returns_value, data.totals.currency)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">YoY pozitiv</h3>
                </div>
                <p className="mt-2 text-sm text-emerald-700">
                  Rezervările au crescut la {data.totals.yoy.bookings_current} față de {data.totals.yoy.bookings_previous} anul trecut.
                </p>
              </div>
            </div>
          </ReportSection>

          <ReportSection
            title="Recomandări operaționale"
            description="Acțiuni sugerate pentru a susține creșterea săptămânii următoare."
          >
            <InsightList
              items={data.recommendations}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </ReportSection>
        </div>
      ) : null}
    </div>
  );
}
