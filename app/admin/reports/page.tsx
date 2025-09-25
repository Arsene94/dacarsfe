import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import { calculateVariation, formatCurrency, formatPercent, formatNumber } from "@/components/admin/reports/formatters";

const weeklyRevenue = {
  current: 48200,
  previous: 44100,
};

const reservationSummary = {
  current: 138,
  previous: 124,
};

const fleetUtilization = {
  current: 0.78,
  previous: 0.74,
};

const overviewChart = [
  { label: "Ianuarie", current: 182000, previous: 165000 },
  { label: "Februarie", current: 195400, previous: 172500 },
  { label: "Martie", current: 221300, previous: 204000 },
];

const detailedLinks = [
  {
    title: "Raport săptămânal",
    description:
      "Vânzări pe zile, grad de ocupare pe segmente și performanța canalelor de achiziție pentru ultimele 7 zile.",
    href: "/admin/reports/weekly",
  },
  {
    title: "Raport lunar",
    description:
      "Indicatori financiari, mixul rezervărilor și analiza diferențelor față de luna precedentă și anul trecut.",
    href: "/admin/reports/monthly",
  },
  {
    title: "Raport trimestrial",
    description:
      "Evoluția veniturilor, profitabilitate operațională și trenduri pe categorii de vehicule în ultimele 3 luni.",
    href: "/admin/reports/quarterly",
  },
];

export default function ReportsOverviewPage() {
  const revenueDelta = calculateVariation(weeklyRevenue.current, weeklyRevenue.previous);
  const bookingDelta = calculateVariation(reservationSummary.current, reservationSummary.previous);
  const utilizationDelta = calculateVariation(fleetUtilization.current, fleetUtilization.previous);

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-jade">Analytics & insight</p>
        <h1 className="text-3xl font-semibold text-slate-900">Rapoarte de performanță DaCars</h1>
        <p className="max-w-3xl text-base text-slate-600">
          Monitorizează rapid sănătatea afacerii folosind rezumatele de mai jos și intră în detalii pe rapoartele dedicate.
          Datele sunt agregate automat din rezervări, facturare și managementul flotei.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Încasări săptămâna curentă
          </h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(weeklyRevenue.current)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Săptămâna trecută: {formatCurrency(weeklyRevenue.previous)}
          </p>
          <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(revenueDelta.ratio)}`}>
            {getDeltaLabel(revenueDelta.ratio)} vs săptămâna trecută
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Vârful de încasări a fost miercuri (12.800 €), datorită rezervărilor corporate și a promoției city-break.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Rezervări confirmate</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(reservationSummary.current)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Săptămâna trecută: {formatNumber(reservationSummary.previous)}
          </p>
          <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(bookingDelta.ratio)}`}>
            {getDeltaLabel(bookingDelta.ratio)} volum de rezervări
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Conversia formularelor din site a urcat la 5,4%, cu 38% dintre rezervări venind din campaniile de remarketing.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Grad de utilizare flotă</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatPercent(fleetUtilization.current)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Săptămâna trecută: {formatPercent(fleetUtilization.previous)}
          </p>
          <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(utilizationDelta.ratio)}`}>
            {getDeltaLabel(utilizationDelta.ratio)} rată de ocupare
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Clasa SUV a avut cea mai mare cerere (+14% față de săptămâna trecută), în timp ce segmentele economy au rămas stabile.
          </p>
        </article>
      </section>

      <TrendBarChart
        title="Evoluția încasărilor din primul trimestru"
        description="Comparație între anul curent și anul trecut, consolidată la nivel lunar."
        data={overviewChart}
        legend={[
          {
            label: "An curent",
            colorClass: "bg-jade",
            description: "Sume facturate și încasate efectiv",
          },
          {
            label: "An precedent",
            colorClass: "bg-berkeley/60",
            description: "Valori pentru aceeași perioadă din 2024",
          },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        {detailedLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-jade/40 hover:shadow-md"
          >
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
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
