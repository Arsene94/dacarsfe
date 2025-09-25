import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import {
  calculateVariation,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/admin/reports/formatters";
import { getMonthlyReport } from "@/lib/reports/server";

const DEFAULT_MONTH = "2025-03";

const capitalize = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export default async function MonthlyReportPage() {
  const report = await getMonthlyReport({ month: DEFAULT_MONTH });

  const revenueDelta = calculateVariation(
    report.financials.revenue.current,
    report.financials.revenue.previous,
  );
  const profitDelta = calculateVariation(
    report.financials.net_profit.current,
    report.financials.net_profit.previous,
  );
  const adrDelta = calculateVariation(
    report.financials.avg_daily_rate.current,
    report.financials.avg_daily_rate.previous,
  );
  const utilizationDelta = calculateVariation(
    report.financials.fleet_utilization.current,
    report.financials.fleet_utilization.previous,
  );
  const bookingsDelta = calculateVariation(
    report.bookings.total.current,
    report.bookings.total.previous,
  );

  const costStructureData = [
    { label: "Flotă", ...report.cost_structure.fleet },
    { label: "Operațiuni", ...report.cost_structure.operations },
    { label: "Marketing", ...report.cost_structure.marketing },
    { label: "Alte costuri", ...report.cost_structure.other },
  ].map((item) => ({
    label: item.label,
    current: item.current,
    previous: item.previous,
  }));

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-jade">Raport lunar</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {report.period.label} – performanță și comparații
        </h1>
        <p className="max-w-3xl text-base text-slate-600">
          Analiza lunară centralizează veniturile, volumul rezervărilor și costurile operaționale. Datele sunt
          comparate cu {report.period.comparison.label} pentru a evidenția trendurile reale.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Venituri totale</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(report.financials.revenue.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatCurrency(report.financials.revenue.previous)}
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
            {formatCurrency(report.financials.net_profit.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatCurrency(report.financials.net_profit.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(profitDelta.ratio)}`}
          >
            {getDeltaLabel(profitDelta.ratio)} vs perioada comparată
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Tarif mediu zilnic</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(report.financials.avg_daily_rate.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatCurrency(report.financials.avg_daily_rate.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(adrDelta.ratio)}`}
          >
            {getDeltaLabel(adrDelta.ratio)} ADR
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Grad de utilizare flotă</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatPercent(report.financials.fleet_utilization.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {report.period.comparison.label}: {formatPercent(report.financials.fleet_utilization.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(utilizationDelta.ratio)}`}
          >
            {getDeltaLabel(utilizationDelta.ratio)} rată de ocupare
          </span>
        </article>
      </section>

      <TrendBarChart
        title="Venituri și profit pe ultimele 6 luni"
        description="Compară veniturile brute cu profitul net pentru a evalua sustenabilitatea creșterii."
        data={report.six_month_trend.map((item) => ({
          label: item.label,
          current: item.revenue,
          previous: item.profit,
        }))}
        legend={[
          { label: "Venituri", colorClass: "bg-jade" },
          { label: "Profit net", colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mixul de clienți și impactul asupra veniturilor</h2>
          <p className="text-sm text-slate-600">
            Contractele corporate reprezintă {formatPercent(report.bookings.corporate_share.current)} din rezervări,
            față de {formatPercent(report.bookings.corporate_share.previous)} în perioada comparată. Totalul
            rezervărilor a ajuns la {formatNumber(report.bookings.total.current)} ({getDeltaLabel(bookingsDelta.ratio)} vs
            {" "}
            {report.period.comparison.label}).
          </p>
          <TrendBarChart
            title="Distribuția rezervărilor pe canale"
            data={report.customer_mix.map((item) => ({
              label: item.label,
              current: item.current_percent,
              previous: item.previous_percent,
            }))}
            legend={[
              { label: `% ${report.period.label}`, colorClass: "bg-jade" },
              { label: `% ${report.period.comparison.label}`, colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Top orașe după rezervări</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            {report.bookings.top_cities.map((city) => (
              <li key={city.city} className="flex items-center justify-between">
                <span className="font-medium text-slate-700">{city.city}</span>
                <span>
                  {formatNumber(city.current)}
                  <span className="text-xs text-slate-500"> (vs {formatNumber(city.previous)})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <TrendBarChart
          title="Structura costurilor"
          data={costStructureData}
          legend={[
            { label: `${capitalize(report.period.label)} – cost curent`, colorClass: "bg-jade" },
            { label: `${capitalize(report.period.comparison.label)} – cost comparat`, colorClass: "bg-berkeley/60" },
          ]}
          formatter={(value) => formatCurrency(value)}
        />

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Focus pe acțiuni și riscuri</h2>
          <ul className="list-disc space-y-2 pl-6 text-sm text-slate-600">
            {report.focus_areas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
