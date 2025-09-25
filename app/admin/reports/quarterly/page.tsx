import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import {
  calculateVariation,
  formatCurrency,
  formatPercent,
} from "@/components/admin/reports/formatters";
import { getQuarterlyReport } from "@/lib/reports/server";

const DEFAULT_QUARTER = "2025-Q1";

export default async function QuarterlyReportPage() {
  const report = await getQuarterlyReport({ quarter: DEFAULT_QUARTER });

  const revenueDelta = calculateVariation(
    report.kpi.revenue.current,
    report.kpi.revenue.previous,
  );
  const profitDelta = calculateVariation(
    report.kpi.net_profit.current,
    report.kpi.net_profit.previous,
  );
  const ebitdaDelta = calculateVariation(
    report.kpi.ebitda_margin.current,
    report.kpi.ebitda_margin.previous,
  );
  const utilizationDelta = calculateVariation(
    report.kpi.fleet_utilization.current,
    report.kpi.fleet_utilization.previous,
  );

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-jade">Raport trimestrial</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {report.period.label} – performanță consolidată
        </h1>
        <p className="max-w-3xl text-base text-slate-600">
          Raportul trimestrial pune în perspectivă evoluția business-ului DaCars. Analiza include comparații cu
          {" "}
          {report.period.comparison.label} pentru a identifica trendurile sustenabile și zonele care necesită
          intervenție.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Venituri totale</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(report.kpi.revenue.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatCurrency(report.kpi.revenue.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(revenueDelta.ratio)}`}
          >
            {getDeltaLabel(revenueDelta.ratio)} vs perioada comparată
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Profit net</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(report.kpi.net_profit.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatCurrency(report.kpi.net_profit.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(profitDelta.ratio)}`}
          >
            {getDeltaLabel(profitDelta.ratio)} vs perioada comparată
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Marjă EBITDA</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatPercent(report.kpi.ebitda_margin.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatPercent(report.kpi.ebitda_margin.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(ebitdaDelta.ratio)}`}
          >
            {getDeltaLabel(ebitdaDelta.ratio)} vs perioada comparată
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Utilizare flotă</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatPercent(report.kpi.fleet_utilization.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatPercent(report.kpi.fleet_utilization.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(utilizationDelta.ratio)}`}
          >
            {getDeltaLabel(utilizationDelta.ratio)} vs perioada comparată
          </span>
        </article>
      </section>

      <TrendBarChart
        title={`Venituri lunare – ${report.period.label}`}
        description={`Comparație lunară între ${report.period.label} și ${report.period.comparison.label}.`}
        data={report.quarterly_revenue}
        legend={[
          { label: report.period.label, colorClass: "bg-jade" },
          { label: report.period.comparison.label, colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Profitabilitate pe segmente</h2>
          <p className="text-sm text-slate-600">
            Segmentul SUV generează {formatCurrency(report.profit_by_segment.find((item) => item.segment === "SUV")?.current ?? 0)}
            {" "}
            și conduce creșterea profitului trimestrial, urmat de segmentele compact și economy.
          </p>
          <TrendBarChart
            title="Contribuție la profit"
            data={report.profit_by_segment.map((item) => ({
              label: item.segment,
              current: item.current,
              previous: item.previous,
            }))}
            legend={[
              { label: report.period.label, colorClass: "bg-jade" },
              { label: report.period.comparison.label, colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => formatCurrency(value)}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Disponibilitatea flotei</h2>
          <TrendBarChart
            title="Structură flotă activă"
            data={report.fleet_availability.map((item) => ({
              label: item.label,
              current: item.current_percent,
              previous: item.previous_percent,
            }))}
            legend={[
              { label: report.period.label, colorClass: "bg-jade" },
              { label: report.period.comparison.label, colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Insight-uri strategice</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-600">
          {report.strategic_insights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
