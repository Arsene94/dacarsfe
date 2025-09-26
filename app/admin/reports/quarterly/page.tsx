"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { BriefcaseBusiness, RefreshCw, Sparkles } from "lucide-react";
import apiClient from "@/lib/api";
import type { AdminReportQuarterlyResponse } from "@/types/reports";
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
  { value: "same_quarter_last_year", label: "Același trimestru anul trecut" },
  { value: "previous_quarter", label: "Trimestrul anterior" },
  { value: "custom", label: "Trimestru personalizat" },
] as const;

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

export default function AdminQuarterlyReportPage() {
  const [data, setData] = useState<AdminReportQuarterlyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<{
    quarter: string;
    compareWith: "same_quarter_last_year" | "previous_quarter" | "custom";
    customQuarter: string;
  }>({ quarter: "", compareWith: "same_quarter_last_year", customQuarter: "" });
  const [formQuarter, setFormQuarter] = useState("");
  const [formCompareWith, setFormCompareWith] = useState<
    "same_quarter_last_year" | "previous_quarter" | "custom"
  >("same_quarter_last_year");
  const [formCustomQuarter, setFormCustomQuarter] = useState("");

  const loadData = useCallback(async () => {
    if (!query.quarter) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchAdminReportQuarterly({
        quarter: query.quarter,
        compare_with: query.compareWith,
        custom_compare:
          query.compareWith === "custom" && query.customQuarter
            ? query.customQuarter
            : undefined,
      });
      setData(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nu am putut încărca raportul trimestrial.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query.compareWith, query.customQuarter, query.quarter]);

  useEffect(() => {
    if (!query.quarter) {
      const option = quarterOptions[0] ?? "";
      setFormQuarter(option);
      setQuery((prev) => ({ ...prev, quarter: option }));
      return;
    }
    void loadData();
  }, [loadData, query.quarter]);

  useEffect(() => {
    if (!data) {
      return;
    }
    setFormQuarter(data.period.quarter);
    setFormCompareWith(query.compareWith);
    if (query.compareWith === "custom" && data.period.comparison.quarter) {
      setFormCustomQuarter(data.period.comparison.quarter);
    }
  }, [data, query.compareWith]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setQuery({
        quarter: formQuarter,
        compareWith: formCompareWith,
        customQuarter: formCustomQuarter,
      });
    },
    [formCompareWith, formCustomQuarter, formQuarter],
  );

  const handleReset = useCallback(() => {
    if (data) {
      setFormQuarter(data.period.quarter);
      setFormCustomQuarter(data.period.comparison.quarter);
    }
    setFormCompareWith("same_quarter_last_year");
    setQuery({
      quarter: data?.period.quarter ?? formQuarter,
      compareWith: "same_quarter_last_year",
      customQuarter: data?.period.comparison.quarter ?? "",
    });
  }, [data, formQuarter]);

  const revenueData = useMemo<ChartData<"bar"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.quarterly_revenue.map((item) => item.label),
      datasets: [
        {
          label: data.period.label,
          data: data.quarterly_revenue.map((item) => item.current),
          backgroundColor: getColor("primary"),
          borderRadius: 12,
        },
        {
          label: data.period.comparison.label,
          data: data.quarterly_revenue.map((item) => item.previous),
          backgroundColor: getColor("accentLight"),
          borderRadius: 12,
        },
      ],
    } satisfies ChartData<"bar">;
  }, [data]);

  const revenueOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currency = data?.kpi.currency ?? "EUR";
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

  const profitBySegmentData = useMemo<ChartData<"bar"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.profit_by_segment.map((item) => item.segment),
      datasets: [
        {
          label: data.period.label,
          data: data.profit_by_segment.map((item) => item.current),
          backgroundColor: getColor("accent"),
          borderRadius: 12,
        },
        {
          label: data.period.comparison.label,
          data: data.profit_by_segment.map((item) => item.previous),
          backgroundColor: getColor("info"),
          borderRadius: 12,
        },
      ],
    } satisfies ChartData<"bar">;
  }, [data]);

  const profitBySegmentOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const currency = data?.kpi.currency ?? "EUR";
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

  const availabilityData = useMemo<ChartData<"doughnut"> | null>(() => {
    if (!data) {
      return null;
    }
    return {
      labels: data.fleet_availability.map((item) => item.label),
      datasets: [
        {
          data: data.fleet_availability.map((item) => item.current_percent),
          backgroundColor: [
            getColor("primary"),
            getColor("accent"),
            getColor("warning"),
            getColor("neutral"),
          ],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    } satisfies ChartData<"doughnut">;
  }, [data]);

  const availabilityOptions = useMemo<ChartOptions<"doughnut">>(
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

  const topProfitSegment = useMemo(() => {
    if (!data || data.profit_by_segment.length === 0) {
      return null;
    }
    return data.profit_by_segment.reduce((best, item) =>
      item.current > best.current ? item : best,
    data.profit_by_segment[0]);
  }, [data]);

  const primaryAvailability = useMemo(() => {
    if (!data || data.fleet_availability.length === 0) {
      return null;
    }
    const active = data.fleet_availability.find((item) => item.label === "Activ");
    return active ?? data.fleet_availability[0];
  }, [data]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-berkeley">Raport trimestrial</h1>
        <p className="text-sm text-slate-600">
          Evaluează performanța trimestrului selectat versus perioada de referință.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="quarter-select">
              Trimestru analizat
            </label>
            <Select
              id="quarter-select"
              value={formQuarter}
              onValueChange={(value) => setFormQuarter(value)}
            >
              {quarterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-600" htmlFor="quarter-compare">
              Comparație
            </label>
            <Select
              id="quarter-compare"
              value={formCompareWith}
              onValueChange={(value) =>
                setFormCompareWith(
                  value as "same_quarter_last_year" | "previous_quarter" | "custom",
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
              <label className="text-sm font-medium text-slate-600" htmlFor="custom-quarter">
                Trimestru comparație
              </label>
              <Input
                id="custom-quarter"
                type="text"
                pattern="\\d{4}-Q[1-4]"
                placeholder="2024-Q4"
                value={formCustomQuarter}
                onChange={(event) => setFormCustomQuarter(event.target.value)}
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
              value={formatCurrency(data.kpi.revenue.current, data.kpi.currency)}
              subtitle={data.period.label}
              {...describeRelativeChange(
                data.kpi.revenue.current,
                data.kpi.revenue.previous,
                data.period.comparison.label,
              )}
            />
            <MetricCard
              title="Profit net"
              value={formatCurrency(data.kpi.net_profit.current, data.kpi.currency)}
              subtitle="După toate costurile"
              {...describeRelativeChange(
                data.kpi.net_profit.current,
                data.kpi.net_profit.previous,
                data.period.comparison.label,
              )}
            />
            <MetricCard
              title="Marjă EBITDA"
              value={formatPercent(data.kpi.ebitda_margin.current)}
              subtitle="Calitate operațională"
              {...describeRelativeChange(
                data.kpi.ebitda_margin.current,
                data.kpi.ebitda_margin.previous,
                data.period.comparison.label,
              )}
            />
            <MetricCard
              title="Utilizare flotă"
              value={formatPercent(data.kpi.fleet_utilization.current)}
              subtitle="Grad mediu trimestrial"
              {...describeRelativeChange(
                data.kpi.fleet_utilization.current,
                data.kpi.fleet_utilization.previous,
                data.period.comparison.label,
              )}
            />
          </StatGrid>

          <ReportSection
            title="Evoluția lunară în trimestru"
            description="Compară veniturile lunare cu perioada de referință."
          >
            <ChartContainer>
              {revenueData ? <Bar options={revenueOptions} data={revenueData} /> : null}
            </ChartContainer>
          </ReportSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportSection
              title="Profit pe segment"
              description="Analizează contribuția fiecărui segment la profitul trimestrial."
            >
              <ChartContainer heightClass="h-80">
                {profitBySegmentData ? (
                  <Bar options={profitBySegmentOptions} data={profitBySegmentData} />
                ) : null}
              </ChartContainer>
            </ReportSection>

            <ReportSection
              title="Disponibilitate flotă"
              description="Distribuția flotei pe stări operaționale."
            >
              <ChartContainer heightClass="h-80">
                {availabilityData ? (
                  <Doughnut options={availabilityOptions} data={availabilityData} />
                ) : null}
              </ChartContainer>
            </ReportSection>
          </div>

          <ReportSection
            title="Direcții strategice"
            description="Folosește insight-urile pentru planurile comerciale și operaționale."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <BriefcaseBusiness className="h-4 w-4 text-jade" /> Recomandări cheie
                </h3>
                <InsightList items={data.strategic_insights} />
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-semibold">Observație rapidă</span>
                </div>
                <p className="mt-3">
                  {topProfitSegment && primaryAvailability
                    ? `Segmentul cu cea mai mare contribuție este ${topProfitSegment.segment}, cu ${formatCurrency(
                        topProfitSegment.current,
                        data.kpi.currency,
                      )} profit și o disponibilitate activă de ${formatPercent(
                        primaryAvailability.current_percent / 100,
                      )}.`
                    : "Optimizează mixul de flotă pentru a menține ritmul pozitiv."}
                </p>
              </div>
            </div>
          </ReportSection>
        </div>
      ) : null}
    </div>
  );
}
