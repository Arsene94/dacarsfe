import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import {
  calculateVariation,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/admin/reports/formatters";

const dailyRevenue = [
  { label: "L", current: 6200, previous: 5800 },
  { label: "Ma", current: 6700, previous: 6120 },
  { label: "Mi", current: 8200, previous: 7050 },
  { label: "J", current: 7600, previous: 6980 },
  { label: "V", current: 7200, previous: 6890 },
  { label: "S", current: 9300, previous: 8450 },
  { label: "D", current: 7200, previous: 6810 },
];

const channelMix = [
  { label: "Direct", current: 54, previous: 49 },
  { label: "Corporate", current: 26, previous: 24 },
  { label: "OTA", current: 12, previous: 16 },
  { label: "Agenții", current: 8, previous: 11 },
];

const occupancyBySegment = [
  { label: "Economy", current: 0.74, previous: 0.71 },
  { label: "Compact", current: 0.79, previous: 0.75 },
  { label: "SUV", current: 0.88, previous: 0.77 },
  { label: "Premium", current: 0.65, previous: 0.62 },
];

const weeklyTotals = {
  revenue: { current: 48200, previous: 44100 },
  bookings: { current: 138, previous: 124 },
  cancellations: { current: 11, previous: 15 },
  averageDuration: { current: 4.2, previous: 3.9 },
};

const cancellationRate = calculateVariation(
  weeklyTotals.cancellations.current,
  weeklyTotals.cancellations.previous,
);

export default function WeeklyReportPage() {
  const revenueDelta = calculateVariation(
    weeklyTotals.revenue.current,
    weeklyTotals.revenue.previous,
  );
  const bookingsDelta = calculateVariation(
    weeklyTotals.bookings.current,
    weeklyTotals.bookings.previous,
  );
  const durationDelta = calculateVariation(
    weeklyTotals.averageDuration.current,
    weeklyTotals.averageDuration.previous,
  );

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-jade">Raport săptămânal</p>
        <h1 className="text-3xl font-semibold text-slate-900">Sinteză 10 - 16 martie 2025</h1>
        <p className="max-w-3xl text-base text-slate-600">
          Rezumatul reunește dinamica rezervărilor, încasările și gradul de utilizare al flotei pentru ultimele 7 zile,
          comparat cu săptămâna anterioară și cu trendul mediu din același interval al anului trecut.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Total încasări</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(weeklyTotals.revenue.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Săptămâna trecută: {formatCurrency(weeklyTotals.revenue.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(revenueDelta.ratio)}`}
          >
            {getDeltaLabel(revenueDelta.ratio)} vs săptămâna trecută
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Rezervări confirmate</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(weeklyTotals.bookings.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Față de săpt. trecută: {formatNumber(weeklyTotals.bookings.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(bookingsDelta.ratio)}`}
          >
            {getDeltaLabel(bookingsDelta.ratio)} volum
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Durata medie a rezervărilor</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {weeklyTotals.averageDuration.current.toFixed(1)} zile
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Săptămâna trecută: {weeklyTotals.averageDuration.previous.toFixed(1)} zile
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(durationDelta.ratio)}`}
          >
            {getDeltaLabel(durationDelta.ratio)} durată
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Anul precedent</h2>
          <p className="mt-3 text-lg font-semibold text-slate-900">+{formatPercent(0.11)} venituri YoY</p>
          <p className="mt-2 text-sm text-slate-600">
            vs aceeași săptămână din 2024 ({formatCurrency(43500)} încasări, 117 rezervări confirmate).
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Creșterea provine din mixul corporate (+18% YoY) și tarife medii mai mari pe segmentul SUV.
          </p>
        </article>
      </section>

      <TrendBarChart
        title="Încasări zilnice"
        description="Valorile includ toate încasările confirmate până la închiderea zilei, comparativ cu săptămâna anterioară."
        data={dailyRevenue}
        legend={[
          { label: "Săptămâna curentă", colorClass: "bg-jade" },
          { label: "Săptămâna trecută", colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Analiza rezervărilor și a canalelor</h2>
          <p className="text-sm text-slate-600">
            Canalul direct a generat {formatPercent(0.54)} din rezervări, cu un tarif mediu de 68 €/zi. Partenerii corporate au
            adus {formatNumber(36)} rezervări, iar OTA-urile au scăzut față de săptămâna trecută din cauza reducerii bugetelor de
            marketing.
          </p>
          <TrendBarChart
            title="Mixul de rezervări"
            data={channelMix}
            legend={[
              { label: "% săptămâna curentă", colorClass: "bg-jade" },
              { label: "% săptămâna trecută", colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Indicatori de risc</h2>
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Rata anulărilor</p>
            <p className="mt-1">
              {formatNumber(weeklyTotals.cancellations.current)} anulări ({formatPercent(weeklyTotals.cancellations.current / weeklyTotals.bookings.current)} din rezervări confirmate)
              – {getDeltaLabel(cancellationRate.ratio)} față de săptămâna trecută.
            </p>
          </div>
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Întârzieri la returnare</p>
            <p className="mt-1">
              {formatNumber(6)} contracte au depășit termenul de predare cu peste 3 ore. Echipa operațională a aplicat penalități
              în valoare de {formatCurrency(720)}, deja facturate.
            </p>
          </div>
        </div>
      </section>

      <TrendBarChart
        title="Gradul de utilizare pe segmente"
        description="Raportat la numărul de vehicule active pe fiecare clasă, inclusiv cele în service."
        data={occupancyBySegment.map((item) => ({
          label: item.label,
          current: Math.round(item.current * 100),
          previous: Math.round(item.previous * 100),
        }))}
        legend={[
          { label: "Săptămâna curentă", colorClass: "bg-jade" },
          { label: "Săptămâna trecută", colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => `${value}%`}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Acțiuni recomandate</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-600">
          <li>
            Activează o campanie flash pentru segmentul economy în weekend pentru a reduce stocul disponibil (42 de mașini
            neînchiriate în medie).
          </li>
          <li>
            Propune partenerilor corporate un upgrade către SUV în lunile următoare – disponibilitate ridicată și tarif mai mare
            cu 18% față de economy.
          </li>
          <li>
            Continuă optimizarea paginilor de destinație: conversia din trafic organic a crescut la {formatPercent(0.064)}.
          </li>
        </ul>
      </section>
    </div>
  );
}
