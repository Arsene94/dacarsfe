"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ChartData, ChartOptions } from "chart.js";
import { ArrowRight, CalendarDays, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api";
import type { AdminReportOverviewResponse } from "@/types/reports";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  InsightList,
  MetricCard,
  ReportSection,
  StatGrid,
} from "@/components/admin/reports/ReportElements";
import { BarChart } from "@/components/admin/reports/ChartPrimitives";
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

const buildQuarterOptions = () => {
  const options: string[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) + 1;
  for (let i = 0; i < 8; i += 1) {
    options.push(`${year}-Q${quarter}`);
    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
  }
  return options;
};

const quarterOptions = buildQuarterOptions();

export default function AdminReportsOverviewPage() {
  const [data, setData] = useState<AdminReportOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<{ weekStart: string; quarter: string }>(
    { weekStart: "", quarter: "" },
  );
  const [formWeekStart, setFormWeekStart] = useState("");
  const [formQuarter, setFormQuarter] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchAdminReportOverview({
        week_start: query.weekStart || undefined,
        quarter: query.quarter || undefined,
      });
      setData(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nu am putut încărca raportul.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query.quarter, query.weekStart]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (!query.weekStart && !formWeekStart) {
      setFormWeekStart(data.week.start);
    }
    if (!query.quarter && !formQuarter) {
      setFormQuarter(data.quarter.code);
    }
  }, [data, formQuarter, formWeekStart, query.quarter, query.weekStart]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery({
        weekStart: formWeekStart,
        quarter: formQuarter,
      });
    },
    [formQuarter, formWeekStart],
  );

  const handleReset = useCallback(() => {
    setQuery({ weekStart: "", quarter: "" });
    setFormWeekStart(data?.week.start ?? "");
    setFormQuarter(data?.quarter.code ?? "");
  }, [data]);

  const quarterChartData = useMemo<ChartData<"bar"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.quarter.chart.map((point) => point.label),
      datasets: [
        {
          label: data.quarter.code,
          data: data.quarter.chart.map((point) => point.current),
          backgroundColor: getColor("primary"),
          borderRadius: 12,
        },
        {
          label: data.quarter.comparison_code,
          data: data.quarter.chart.map((point) => point.previous),
          backgroundColor: getColor("accentLight"),
          borderRadius: 12,
        },
      ],
    } satisfies ChartData<"bar">;
  }, [data]);

  const quarterChartOptions = useMemo<ChartOptions<"bar">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const currency = data?.week.currency ?? "EUR";
            const value = context.raw as number;
            return `${context.dataset.label}: ${formatCurrency(value, currency)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#1A3661" },
      },
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
  }), [data]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-berkeley">Rapoarte performanță</h1>
        <p className="text-sm text-slate-600">
          Monitorizează indicatorii cheie ai săptămânii curente și comparațiile trimestriale.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          className="flex flex-col gap-4 md:flex-row md:items-end"
          onSubmit={handleSubmit}
        >
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="week-start">
              Săptămâna de referință
            </label>
            <Input
              id="week-start"
              type="date"
              value={formWeekStart}
              onChange={(event) => setFormWeekStart(event.target.value)}
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="quarter">
              Trimestru de comparație
            </label>
            <select
              id="quarter"
              className="select-trigger w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-[#191919] shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
              value={formQuarter}
              onChange={(event) => setFormQuarter(event.target.value)}
            >
              <option value="">Trimestru activ</option>
              {quarterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" className="bg-jade px-6 text-white" disabled={loading}>
              Aplică filtrele
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Resetează
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
              title="Venit săptămânal"
              value={formatCurrency(data.week.revenue.current, data.week.currency)}
              subtitle={`Săptămâna ${data.week.start} – ${data.week.end}`}
              {...describeRelativeChange(
                data.week.revenue.current,
                data.week.revenue.previous,
                "săptămâna precedentă",
              )}
            />
            <MetricCard
              title="Rezervări confirmate"
              value={`${data.week.bookings.current}`}
              subtitle="Incluzând toate canalele"
              {...describeRelativeChange(
                data.week.bookings.current,
                data.week.bookings.previous,
                "săptămâna precedentă",
              )}
            />
            <MetricCard
              title="Grad de utilizare flotă"
              value={formatPercent(data.week.fleet_utilization.current)}
              subtitle="Disponibilitate raportată la stoc"
              {...describeRelativeChange(
                data.week.fleet_utilization.current,
                data.week.fleet_utilization.previous,
                "săptămâna precedentă",
              )}
            />
            <MetricCard
              title="Venit mediu / rezervare"
              value={formatCurrency(
                data.week.revenue.current / Math.max(data.week.bookings.current, 1),
                data.week.currency,
              )}
              subtitle="Calculează ARPU săptămânal"
            />
          </StatGrid>

          <ReportSection
            title="Comparație trimestrială"
            description={`Venituri ${data.quarter.code} vs ${data.quarter.comparison_code}`}
          >
            <ChartContainer>
              {quarterChartData ? (
                <BarChart options={quarterChartOptions} data={quarterChartData} />
              ) : null}
            </ChartContainer>
          </ReportSection>

          <ReportSection
            title="Accese rapide"
            description="Navighează către rapoartele detaliate pentru intervale dedicate."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.links.map((link) => (
                <Link
                  key={link.slug}
                  href={link.href}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-jade hover:shadow-lg"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-berkeley">{link.title}</p>
                    <p className="text-xs text-slate-500">
                      Explorează indicatorii cheie pentru perioada selectată.
                    </p>
                  </div>
                  <span className="mt-4 flex items-center gap-2 text-sm font-medium text-jade group-hover:text-jadeLight">
                    Deschide raportul
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </ReportSection>

          <ReportSection
            title="Context săptămânal"
            description="Rezumatul rapid te ajută să comunici progresul echipei operaționale."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  <CalendarDays className="h-4 w-4 text-jade" />
                  Ferestre analizate
                </h3>
                <p className="text-sm text-slate-700">
                  Intervalul curent acoperă {data.week.start} – {data.week.end}, cu referință la
                  perioada {data.quarter.comparison_code} pentru comparația trimestrială.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Recomandări pentru analiză
                </h3>
                <InsightList
                  items={[
                    "Verifică variațiile canalelor înainte de întâlnirile săptămânale.",
                    "Consolidează oportunitățile din campaniile trimestriale de marketing.",
                    "Partajează datele de utilizare cu echipa de flotă pentru planificare.",
                  ]}
                />
              </div>
            </div>
          </ReportSection>
        </div>
      ) : null}
    </div>
  );
}
