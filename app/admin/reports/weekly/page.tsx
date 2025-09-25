import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import {
  calculateVariation,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/admin/reports/formatters";
import { getWeeklyReport } from "@/lib/reports/server";

const DEFAULT_WEEK_START = "2025-03-10";

const dayFormatter = new Intl.DateTimeFormat("ro-RO", { day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("ro-RO", { month: "long" });
const yearFormatter = new Intl.DateTimeFormat("ro-RO", { year: "numeric" });

const capitalize = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }

  const sameMonth =
    monthFormatter.format(startDate) === monthFormatter.format(endDate) &&
    yearFormatter.format(startDate) === yearFormatter.format(endDate);

  const startLabel = `${dayFormatter.format(startDate)} ${capitalize(monthFormatter.format(startDate))} ${yearFormatter.format(startDate)}`;
  const endLabel = `${dayFormatter.format(endDate)} ${capitalize(monthFormatter.format(endDate))} ${yearFormatter.format(endDate)}`;

  if (sameMonth) {
    return `${dayFormatter.format(startDate)}–${dayFormatter.format(endDate)} ${capitalize(monthFormatter.format(endDate))} ${yearFormatter.format(endDate)}`;
  }
  return `${startLabel} – ${endLabel}`;
};

export default async function WeeklyReportPage() {
  const report = await getWeeklyReport({ start_date: DEFAULT_WEEK_START });
  const otaChannel = report.channel_mix.find((entry) => entry.label === "OTA");
  const otaChange = otaChannel
    ? otaChannel.current_percent - otaChannel.previous_percent
    : 0;
  const otaDirection = otaChange >= 0 ? "urcă" : "coboară";
  const otaMagnitude = Math.abs(otaChange);

  const revenueDelta = calculateVariation(
    report.totals.revenue.current,
    report.totals.revenue.previous,
  );
  const bookingsDelta = calculateVariation(
    report.totals.bookings.current,
    report.totals.bookings.previous,
  );
  const durationDelta = calculateVariation(
    report.totals.average_duration_days.current,
    report.totals.average_duration_days.previous,
  );
  const cancellationDelta = calculateVariation(
    report.totals.cancellations.current,
    report.totals.cancellations.previous,
  );

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-jade">Raport săptămânal</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Sinteză {formatRange(report.period.start, report.period.end)}
        </h1>
        <p className="max-w-3xl text-base text-slate-600">
          Rezumatul reunește dinamica rezervărilor, încasările și gradul de utilizare al flotei pentru
          ultimele 7 zile, comparat cu intervalul {formatRange(report.period.comparison_start, report.period.comparison_end)}.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Total încasări</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(report.totals.revenue.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Perioada comparată: {formatCurrency(report.totals.revenue.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(revenueDelta.ratio)}`}
          >
            {getDeltaLabel(revenueDelta.ratio)} vs perioada de referință
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Rezervări confirmate</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(report.totals.bookings.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Perioada comparată: {formatNumber(report.totals.bookings.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(bookingsDelta.ratio)}`}
          >
            {getDeltaLabel(bookingsDelta.ratio)} volum
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Durata medie</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {report.totals.average_duration_days.current.toFixed(1)} zile
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Perioada comparată: {report.totals.average_duration_days.previous.toFixed(1)} zile
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(durationDelta.ratio)}`}
          >
            {getDeltaLabel(durationDelta.ratio)} durată
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Anul precedent</h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {formatPercent(report.totals.yoy.revenue_ratio)} venituri YoY
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {formatNumber(report.totals.yoy.bookings_current)} rezervări în prezent vs
            {" "}
            {formatNumber(report.totals.yoy.bookings_previous)} în același interval din anul trecut.
          </p>
        </article>
      </section>

      <TrendBarChart
        title="Încasări zilnice"
        description="Valorile includ toate încasările confirmate până la închiderea zilei, comparativ cu perioada de referință."
        data={report.daily_revenue}
        legend={[
          { label: "Săptămâna curentă", colorClass: "bg-jade" },
          { label: "Perioada comparată", colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Analiza rezervărilor și a canalelor</h2>
          <p className="text-sm text-slate-600">
            Canalul direct și partenerii corporate însumează peste 80% din rezervări în această săptămână, în timp ce
            OTA-urile {otaDirection} cu {otaMagnitude.toFixed(1)} pp față de perioada comparată.
          </p>
          <TrendBarChart
            title="Mixul de rezervări"
            data={report.channel_mix.map((item) => ({
              label: item.label,
              current: item.current_percent,
              previous: item.previous_percent,
            }))}
            legend={[
              { label: "% săptămâna curentă", colorClass: "bg-jade" },
              { label: "% perioada comparată", colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Indicatori de risc</h2>
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Rata anulărilor</p>
            <p className="mt-1">
              {formatNumber(report.totals.cancellations.current)} anulări ({
                formatPercent(report.risk_indicators.cancellation_rate)
              }
              ) – {getDeltaLabel(cancellationDelta.ratio)} față de perioada comparată.
            </p>
          </div>
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Întârzieri la returnare</p>
            <p className="mt-1">
              {formatNumber(report.risk_indicators.late_returns_count)} contracte întârziate, cu penalități de
              {" "}
              {formatCurrency(report.risk_indicators.late_returns_value)} deja facturate.
            </p>
          </div>
        </div>
      </section>

      <TrendBarChart
        title="Gradul de utilizare pe segmente"
        description="Raportat la numărul de vehicule active pe fiecare clasă, inclusiv cele în service."
        data={report.occupancy_by_segment.map((item) => ({
          label: item.label,
          current: Math.round(item.current * 100),
          previous: Math.round(item.previous * 100),
        }))}
        legend={[
          { label: "Săptămâna curentă", colorClass: "bg-jade" },
          { label: "Perioada comparată", colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => `${value}%`}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Acțiuni recomandate</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-600">
          {report.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
