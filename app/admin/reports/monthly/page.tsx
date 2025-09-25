import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import {
  calculateVariation,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/admin/reports/formatters";

const monthlyRevenue = [
  { label: "Oct", current: 198000, previous: 176500 },
  { label: "Nov", current: 205400, previous: 182900 },
  { label: "Dec", current: 228100, previous: 210800 },
  { label: "Ian", current: 182000, previous: 165000 },
  { label: "Feb", current: 195400, previous: 172500 },
  { label: "Mar", current: 221300, previous: 204000 },
];

const monthlyKpis = {
  revenue: { current: 221300, previous: 195400 },
  bookings: { current: 612, previous: 574 },
  avgDailyRate: { current: 67, previous: 63 },
  utilization: { current: 0.82, previous: 0.77 },
};

const customerMix = [
  { label: "Corporate", current: 38, previous: 34 },
  { label: "B2C site", current: 44, previous: 46 },
  { label: "OTA", current: 11, previous: 13 },
  { label: "Parteneri locali", current: 7, previous: 7 },
];

const costStructure = [
  { label: "Flotă & leasing", current: 42, previous: 44 },
  { label: "Mentenanță", current: 18, previous: 19 },
  { label: "Marketing", current: 16, previous: 14 },
  { label: "Personal", current: 24, previous: 23 },
];

export default function MonthlyReportPage() {
  const revenueDelta = calculateVariation(
    monthlyKpis.revenue.current,
    monthlyKpis.revenue.previous,
  );
  const bookingDelta = calculateVariation(
    monthlyKpis.bookings.current,
    monthlyKpis.bookings.previous,
  );
  const rateDelta = calculateVariation(
    monthlyKpis.avgDailyRate.current,
    monthlyKpis.avgDailyRate.previous,
  );
  const utilizationDelta = calculateVariation(
    monthlyKpis.utilization.current,
    monthlyKpis.utilization.previous,
  );

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-jade">Raport lunar</p>
        <h1 className="text-3xl font-semibold text-slate-900">Martie 2025 – performanță și comparații</h1>
        <p className="max-w-3xl text-base text-slate-600">
          Analiza lunară centralizează veniturile, volumul rezervărilor și costurile operaționale. Datele sunt puse în context
          prin raportarea la luna precedentă și la aceeași lună din 2024, pentru a evidenția trendurile reale.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Venituri totale</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(monthlyKpis.revenue.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Februarie 2025: {formatCurrency(monthlyKpis.revenue.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(revenueDelta.ratio)}`}
          >
            {getDeltaLabel(revenueDelta.ratio)} vs luna precedentă
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Rezervări confirmate</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(monthlyKpis.bookings.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Februarie 2025: {formatNumber(monthlyKpis.bookings.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(bookingDelta.ratio)}`}
          >
            {getDeltaLabel(bookingDelta.ratio)} volum
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Tarif mediu zilnic</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(monthlyKpis.avgDailyRate.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Februarie 2025: {formatCurrency(monthlyKpis.avgDailyRate.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(rateDelta.ratio)}`}
          >
            {getDeltaLabel(rateDelta.ratio)} ADR
          </span>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Grad de utilizare flotă</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatPercent(monthlyKpis.utilization.current)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Februarie 2025: {formatPercent(monthlyKpis.utilization.previous)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(utilizationDelta.ratio)}`}
          >
            {getDeltaLabel(utilizationDelta.ratio)} rată de ocupare
          </span>
        </article>
      </section>

      <TrendBarChart
        title="Evoluția veniturilor pe ultimele 6 luni"
        description="Date comparate cu anul precedent pentru a urmări ritmul de creștere pe termen mediu."
        data={monthlyRevenue}
        legend={[
          { label: "Anul curent", colorClass: "bg-jade" },
          { label: "Anul precedent", colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mixul de clienți și impactul asupra veniturilor</h2>
          <p className="text-sm text-slate-600">
            Segmentul corporate rămâne principalul driver de creștere (+{formatPercent(0.12)} YoY), beneficiind de contractele
            semnate la final de 2024. Canalul direct B2C a rămas stabil, cu o ușoară scădere a rezervărilor prin OTA pe fondul
            ajustării bugetelor de marketing.
          </p>
          <TrendBarChart
            title="Distribuția rezervărilor pe canale"
            data={customerMix}
            legend={[
              { label: "% martie 2025", colorClass: "bg-jade" },
              { label: "% februarie 2025", colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Profit operațional</h2>
          <p className="text-sm text-slate-600">
            Marja operațională a ajuns la {formatPercent(0.27)}, în creștere cu {formatPercent(0.03)} față de februarie.
            Economiile din mentenanță (−{formatPercent(0.01)}) și optimizarea flotei au compensat investițiile suplimentare în
            marketing pentru campaniile de Paște.
          </p>
          <TrendBarChart
            title="Structura costurilor"
            data={costStructure}
            legend={[
              { label: "% martie 2025", colorClass: "bg-jade" },
              { label: "% februarie 2025", colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Focus pe trenduri și acțiuni</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Segment SUV</p>
            <p className="mt-1">
              Tariful mediu a crescut la {formatCurrency(89)} (+{formatPercent(0.09)} vs 2024). Recomandare: consolidează flota
              cu încă 5 unități înainte de sezonul estival.
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">Loyalty & upsell</p>
            <p className="mt-1">
              {formatNumber(142)} rezervări au inclus upgrade-uri (asigurări, navigație), generând {formatCurrency(18400)} venit
              incremental. Propune pachete similare pentru clienții corporate noi.
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Riscuri și atenționări</p>
            <p className="mt-1">
              Rata incidentelor tehnice rămâne {formatPercent(0.032)}. Pentru a evita indisponibilitatea în aprilie, programează
              mentenanța preventivă pentru cele 7 vehicule identificate în rapoartele service.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
