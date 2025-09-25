import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import {
  calculateVariation,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/admin/reports/formatters";
import { getReportsOverview } from "@/lib/reports/server";

const dayFormatter = new Intl.DateTimeFormat("ro-RO", { day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("ro-RO", { month: "long" });
const yearFormatter = new Intl.DateTimeFormat("ro-RO", { year: "numeric" });

const capitalize = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatWeekRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }

  const startDay = dayFormatter.format(startDate);
  const endDay = dayFormatter.format(endDate);
  const startMonth = capitalize(monthFormatter.format(startDate));
  const endMonth = capitalize(monthFormatter.format(endDate));
  const startYear = yearFormatter.format(startDate);
  const endYear = yearFormatter.format(endDate);

  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay}–${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
};

export default async function ReportsOverviewPage() {
  const overview = await getReportsOverview();
  const { week, quarter, links } = overview;

  const revenueDelta = calculateVariation(week.revenue.current, week.revenue.previous);
  const bookingDelta = calculateVariation(week.bookings.current, week.bookings.previous);
  const utilizationDelta = calculateVariation(
    week.fleet_utilization.current,
    week.fleet_utilization.previous,
  );

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-jade">Analytics & insight</p>
        <h1 className="text-3xl font-semibold text-slate-900">Rapoarte de performanță DaCars</h1>
        <p className="max-w-3xl text-base text-slate-600">
          Monitorizează rapid sănătatea afacerii folosind rezumatele de mai jos și intră în detalii pe
          rapoartele dedicate. Datele provin din API-ul administrativ și sunt actualizate pentru intervalul
          {" "}
          {formatWeekRange(week.start, week.end)}.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Încasări săptămâna curentă
          </h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(week.revenue.current)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Interval precedent: {formatCurrency(week.revenue.previous)}
          </p>
          <p
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(revenueDelta.ratio)}`}
          >
            {getDeltaLabel(revenueDelta.ratio)} vs perioada comparată
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Creșterea săptămânală este susținută de mixul de canale directe și corporate, care generează peste
            80% din încasări.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Rezervări confirmate</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(week.bookings.current)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Perioada comparată: {formatNumber(week.bookings.previous)}
          </p>
          <p
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(bookingDelta.ratio)}`}
          >
            {getDeltaLabel(bookingDelta.ratio)} volum de rezervări
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Valorile includ toate rezervările confirmate și reflectă trendurile pe canale de distribuție și segmente
            de clienți.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Grad de utilizare flotă</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatPercent(week.fleet_utilization.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Perioada comparată: {formatPercent(week.fleet_utilization.previous)}
          </p>
          <p
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(utilizationDelta.ratio)}`}
          >
            {getDeltaLabel(utilizationDelta.ratio)} rată de ocupare
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Rata de utilizare include vehicule active și cele aflate în mentenanță, oferind o imagine completă asupra
            capacității operaționale.
          </p>
        </article>
      </section>

      <TrendBarChart
        title={`Evoluția încasărilor pentru ${quarter.code}`}
        description={`Comparație între ${quarter.code} și ${quarter.comparison_code}, agregată la nivel lunar.`}
        data={quarter.chart}
        legend={[
          {
            label: quarter.code,
            colorClass: "bg-jade",
            description: "Sume facturate și încasate efectiv",
          },
          {
            label: quarter.comparison_code,
            colorClass: "bg-berkeley/60",
            description: "Valori pentru perioada de comparație",
          },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-jade/40 hover:shadow-md"
          >
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm text-slate-600">
                Explorează indicatorii detaliați pentru perioada selectată și descoperă insight-uri operaționale
                dedicate.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-jade group-hover:gap-2">
              Deschide raportul
              <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
