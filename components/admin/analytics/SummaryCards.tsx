'use client';

import type {
  AdminAnalyticsCountryStat,
  AdminAnalyticsScrollStats,
  AdminAnalyticsSummaryTotals,
  AnalyticsDateRange,
} from '@/types/analytics';

type SummaryCardsProps = {
  totals?: AdminAnalyticsSummaryTotals | null;
  scroll?: AdminAnalyticsScrollStats | null;
  range?: AnalyticsDateRange | null;
  countries?: AdminAnalyticsCountryStat[] | null;
  loading?: boolean;
};

const integerFormatter = new Intl.NumberFormat('ro-RO', {
  maximumFractionDigits: 0,
});

const averageFormatter = new Intl.NumberFormat('ro-RO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat('ro-RO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatRange = (range?: AnalyticsDateRange | null): string | null => {
  if (!range) {
    return null;
  }

  const from = range.from ? new Date(range.from) : null;
  const to = range.to ? new Date(range.to) : null;

  if (!from || Number.isNaN(from.getTime()) || !to || Number.isNaN(to.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `${formatter.format(from)} – ${formatter.format(to)}`;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const buildMetricValue = (value: unknown, isAverage = false): string => {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return '—';
  }

  if (isAverage) {
    return averageFormatter.format(numeric);
  }

  return integerFormatter.format(numeric);
};

const buildScrollValue = (value: unknown, isPercentage = false): string => {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return '—';
  }

  return isPercentage
    ? `${percentageFormatter.format(numeric)}%`
    : `${integerFormatter.format(Math.round(numeric))} px`;
};

const formatCountryShare = (value: unknown): string => {
  const numeric = toFiniteNumber(value);
  if (numeric == null) {
    return '—';
  }
  const ratio = Math.min(Math.max(numeric, 0), 1);
  return `${percentageFormatter.format(ratio * 100)}%`;
};

export default function SummaryCards({ totals, scroll, range, loading, countries }: SummaryCardsProps) {
  const metrics = [
    {
      label: 'Evenimente totale',
      value: buildMetricValue(totals?.events ?? null),
    },
    {
      label: 'Vizitatori unici',
      value: buildMetricValue(totals?.unique_visitors ?? null),
    },
    {
      label: 'Sesiuni unice',
      value: buildMetricValue(totals?.unique_sessions ?? null),
    },
    {
      label: 'Evenimente / vizitator',
      value: buildMetricValue(totals?.average_events_per_visitor ?? null, true),
    },
    {
      label: 'Evenimente / sesiune',
      value: buildMetricValue(totals?.average_events_per_session ?? null, true),
    },
  ];

  const scrollMetrics = [
    {
      label: 'Scroll mediu (%)',
      value: buildScrollValue(scroll?.average_percentage ?? null, true),
    },
    {
      label: 'Scroll maxim (%)',
      value: buildScrollValue(scroll?.max_percentage ?? null, true),
    },
    {
      label: 'Scroll mediu (px)',
      value: buildScrollValue(scroll?.average_pixels ?? null),
    },
    {
      label: 'Scroll maxim (px)',
      value: buildScrollValue(scroll?.max_pixels ?? null),
    },
    {
      label: 'Evenimente de scroll',
      value: buildMetricValue(scroll?.total_events ?? null),
    },
  ];

  const intervalLabel = formatRange(range);
  const topCountries = (countries ?? []).slice(0, 3);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-berkeley">Rezumat trafic anonim</h2>
        {intervalLabel ? (
          <p className="text-sm text-slate-600">Interval monitorizat: {intervalLabel}</p>
        ) : (
          <p className="text-sm text-slate-600">
            Interval monitorizat conform selecției curente.
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 shadow-inner"
          >
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">
              {loading ? <span className="block h-7 w-24 animate-pulse rounded bg-slate-200" /> : metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 shadow-inner">
          <p className="text-sm font-medium text-slate-500">Scroll</p>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {scrollMetrics.map((metric) => (
              <div key={metric.label} className="flex flex-col">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</dt>
                <dd className="text-base font-semibold text-slate-800">
                  {loading ? (
                    <span className="block h-5 w-20 animate-pulse rounded bg-slate-200" />
                  ) : (
                    metric.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 shadow-inner">
          <p className="text-sm font-medium text-slate-500">Context</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Rapoartele consolidează evenimentele anonime recepționate prin endpoint-ul public și
            includ detalii despre interacțiuni, scroll și expunerea paginilor.
          </p>
          {scroll?.total_events ? (
            <p className="mt-2 text-xs text-slate-500">
              {integerFormatter.format(scroll.total_events)} evenimente de scroll au fost înregistrate în
              intervalul selectat.
            </p>
          ) : null}
          {topCountries.length ? (
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p className="font-semibold text-slate-600">Top țări după evenimente</p>
              <ul className="space-y-1">
                {topCountries.map((countryStat) => (
                  <li key={countryStat.country ?? 'necunoscut'} className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {countryStat.country && countryStat.country.trim().length > 0
                        ? countryStat.country
                        : 'Țară necunoscută'}
                    </span>
                    <span>
                      {buildMetricValue(countryStat.total_events)} · {formatCountryShare(countryStat.share)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
