import { TrendBarChart } from "@/components/admin/reports/charts";
import { getDeltaLabel, getDeltaTone } from "@/components/admin/reports/delta";
import {
  calculateVariation,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/admin/reports/formatters";

const quarterlyRevenue = [
  { label: "Q2 '24", current: 566000, previous: 498000 },
  { label: "Q3 '24", current: 612400, previous: 542300 },
  { label: "Q4 '24", current: 648900, previous: 583100 },
  { label: "Q1 '25", current: 598700, previous: 532400 },
];

const segmentProfit = [
  { label: "Economy", current: 18, previous: 16 },
  { label: "Compact", current: 26, previous: 22 },
  { label: "SUV", current: 34, previous: 28 },
  { label: "Premium", current: 22, previous: 20 },
];

const operationalCosts = [
  { label: "Flotă", current: 41, previous: 42 },
  { label: "Mentenanță", current: 17, previous: 18 },
  { label: "Marketing", current: 15, previous: 13 },
  { label: "Personal", current: 19, previous: 19 },
  { label: "Altele", current: 8, previous: 8 },
];

const quarterTotals = {
  revenue: 598700,
  revenuePrevQuarter: 648900,
  revenuePrevYear: 532400,
  bookings: 1896,
  bookingsPrevQuarter: 1752,
  bookingsPrevYear: 1640,
  profitMargin: 0.29,
  profitPrevQuarter: 0.27,
  profitPrevYear: 0.24,
  adr: 68,
  adrPrevQuarter: 66,
  adrPrevYear: 62,
};

const fleetAvailability = [
  { label: "Q1 2024", current: 0.74 },
  { label: "Q2 2024", current: 0.79 },
  { label: "Q3 2024", current: 0.81 },
  { label: "Q4 2024", current: 0.83 },
  { label: "Q1 2025", current: 0.86 },
];

export default function QuarterlyReportPage() {
  const revenueQoq = calculateVariation(
    quarterTotals.revenue,
    quarterTotals.revenuePrevQuarter,
  );
  const revenueYoy = calculateVariation(
    quarterTotals.revenue,
    quarterTotals.revenuePrevYear,
  );
  const bookingsYoy = calculateVariation(
    quarterTotals.bookings,
    quarterTotals.bookingsPrevYear,
  );
  const profitYoy = calculateVariation(
    quarterTotals.profitMargin,
    quarterTotals.profitPrevYear,
  );

  return (
    <div className="space-y-10 p-6 md:p-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-jade">Raport trimestrial</p>
        <h1 className="text-3xl font-semibold text-slate-900">Q1 2025 – performanță consolidată</h1>
        <p className="max-w-3xl text-base text-slate-600">
          Raportul trimestrial pune în perspectivă evoluția business-ului DaCars. Analiza cuprinde comparații față de trimestrul
          anterior și față de același trimestru al anului trecut, pentru a identifica trendurile sustenabile și zonele care
          necesită intervenție.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Venituri totale Q1</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(quarterTotals.revenue)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Q4 2024: {formatCurrency(quarterTotals.revenuePrevQuarter)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(revenueQoq.ratio)}`}
          >
            {getDeltaLabel(revenueQoq.ratio)} vs trimestrul anterior
          </span>
          <p className="mt-4 text-xs text-slate-500">
            {getDeltaLabel(revenueYoy.ratio)} față de Q1 2024 ({formatCurrency(quarterTotals.revenuePrevYear)}).
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Rezervări finalizate</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(quarterTotals.bookings)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Q1 2024: {formatNumber(quarterTotals.bookingsPrevYear)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(bookingsYoy.ratio)}`}
          >
            {getDeltaLabel(bookingsYoy.ratio)} YoY
          </span>
          <p className="mt-4 text-xs text-slate-500">
            Q4 2024: {formatNumber(quarterTotals.bookingsPrevQuarter)} rezervări.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Marjă operațională</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatPercent(quarterTotals.profitMargin)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Q1 2024: {formatPercent(quarterTotals.profitPrevYear)}
          </p>
          <span
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getDeltaTone(profitYoy.ratio)}`}
          >
            {getDeltaLabel(profitYoy.ratio)} YoY
          </span>
          <p className="mt-4 text-xs text-slate-500">
            Q4 2024: {formatPercent(quarterTotals.profitPrevQuarter)} marjă.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">ADR trimestrial</h2>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(quarterTotals.adr)}</p>
          <p className="mt-2 text-sm text-slate-600">
            Q1 2024: {formatCurrency(quarterTotals.adrPrevYear)}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            vs trimestrul anterior: {formatCurrency(quarterTotals.adrPrevQuarter)}.
          </p>
        </article>
      </section>

      <TrendBarChart
        title="Venituri trimestriale"
        description="Comparație între ultimii 4 ani fiscali și performanța actuală a trimestrului curent."
        data={quarterlyRevenue}
        legend={[
          { label: "2024-2025", colorClass: "bg-jade" },
          { label: "2023-2024", colorClass: "bg-berkeley/60" },
        ]}
        formatter={(value) => formatCurrency(value)}
      />

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Profitabilitate pe segmente</h2>
          <p className="text-sm text-slate-600">
            Segmentul SUV reprezintă {formatPercent(0.34)} din profitul operațional, fiind susținut de cererea corporate și de
            tarifele dinamice aplicate în lunile ianuarie-martie. Segmentul premium își revine ușor datorită turismului de city
            break.
          </p>
          <TrendBarChart
            title="Contribuție la profit"
            data={segmentProfit}
            legend={[
              { label: "% Q1 2025", colorClass: "bg-jade" },
              { label: "% Q1 2024", colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Structura costurilor</h2>
          <p className="text-sm text-slate-600">
            Costurile de mentenanță au scăzut cu {formatPercent(0.06)} față de trimestrul precedent, în timp ce investițiile în
            marketing au crescut pentru lansarea campaniilor de Paște. Controlul costurilor cu flota rămâne esențial pentru
            menținerea marjei.
          </p>
          <TrendBarChart
            title="Distribuția costurilor"
            data={operationalCosts}
            legend={[
              { label: "% Q1 2025", colorClass: "bg-jade" },
              { label: "% Q4 2024", colorClass: "bg-berkeley/60" },
            ]}
            formatter={(value) => `${value}%`}
          />
        </div>
      </section>

      <TrendBarChart
        title="Disponibilitatea flotei"
        description="Măsurată ca grad mediu de utilizare pe ultimele 5 trimestre."
        data={fleetAvailability.map((item) => ({
          label: item.label,
          current: Math.round(item.current * 100),
        }))}
        legend={[{ label: "Grad de utilizare", colorClass: "bg-jade" }]}
        formatter={(value) => `${value}%`}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Perspective și recomandări</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Extinderea flotei electrice</p>
            <p className="mt-1">
              Cererea pentru vehicule electrice a crescut cu {formatPercent(0.21)} YoY, însă disponibilitatea este limitată (12
              unități). Recomandare: achiziția a încă 8 vehicule până la final de Q2.
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">Corporate retention</p>
            <p className="mt-1">
              {formatNumber(42)} contracte corporate expiră în Q2. Inițiază renegocierea pachetelor cu propuneri de upgrade și
              discount pentru volum pentru a susține creșterea YoY.
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Riscuri</p>
            <p className="mt-1">
              Indisponibilitatea temporară a 9 vehicule premium poate afecta vânzările de weekend. Planifică rotația flotei și
              renegociază termenii cu service-urile partenere pentru a reduce timpul de staționare.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
