"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import type { BarSeries } from "@/components/admin/reports/ChartPrimitives";
import { BarChart } from "@/components/admin/reports/ChartPrimitives";
import { getColor } from "@/components/admin/reports/chartSetup";
import { formatCurrency } from "@/components/admin/reports/formatting";
import { describeRelativeChange } from "@/components/admin/reports/trends";

const formatPercent = (value: number, fractionDigits = 1) =>
  `${(value * 100).toFixed(fractionDigits)}%`;

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

  const quarterChartData = useMemo(() => {
    if (!data) {
      return null;
    }
    return data.quarter.chart.map((point) => ({
      label: point.label,
      current: point.current,
      previous: point.previous,
    }));
  }, [data]);

  const quarterChartSeries = useMemo<BarSeries[]>(
    () =>
      data
        ? [
            {
              dataKey: "current",
              name: data.quarter.code,
              color: getColor("primary"),
              radius: 12,
            },
            {
              dataKey: "previous",
              name: data.quarter.comparison_code,
              color: getColor("accentLight"),
              radius: 12,
            },
          ]
        : [],
    [data],
  );

  const formatThousands = useCallback(
    (value: number | string) => {
      if (typeof value !== "number") {
        return value;
      }
      if (Math.abs(value) < 1000) {
        return value.toLocaleString("ro-RO", { maximumFractionDigits: 0 });
      }
      return `${(value / 1000).toFixed(0)}k`;
    },
    [],
  );

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
                <BarChart
                  data={quarterChartData}
                  xKey="label"
                  series={quarterChartSeries}
                  yTickFormatter={formatThousands}
                  valueFormatter={(value, name) =>
                    `${name}: ${formatCurrency(value, data.week.currency)}`
                  }
                />
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
