import type {
  MonthlyReportResponse,
  OverviewReportResponse,
  QuarterlyReportResponse,
  WeeklyReportResponse,
} from "@/types/reports";

const monthFormatter = new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" });
const monthFormatterShort = new Intl.DateTimeFormat("ro-RO", { month: "short" });
const monthFormatterFull = new Intl.DateTimeFormat("ro-RO", { month: "long" });

const capitalize = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const parseIsoDate = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatMonthLabel = (isoMonth: string): string => {
  const date = parseIsoDate(`${isoMonth}-01`);
  if (!date) {
    return isoMonth;
  }
  return capitalize(monthFormatter.format(date));
};

const addDays = (base: Date, days: number): Date => {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const ensureIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const parseQuarter = (
  quarter: string,
): { year: number; quarterIndex: number } | null => {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/i);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const quarterIndex = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(quarterIndex)) {
    return null;
  }
  return { year, quarterIndex };
};

const formatQuarterLabel = (year: number, quarterIndex: number): string => {
  return `Trimestrul ${["I", "II", "III", "IV"][quarterIndex - 1] ?? quarterIndex} ${year}`;
};

const getPreviousQuarter = (year: number, quarterIndex: number): { year: number; quarterIndex: number } => {
  if (quarterIndex === 1) {
    return { year: year - 1, quarterIndex: 4 };
  }
  return { year, quarterIndex: quarterIndex - 1 };
};

const getQuarterLastYear = (year: number, quarterIndex: number): { year: number; quarterIndex: number } => ({
  year: year - 1,
  quarterIndex,
});

const baseOverview: OverviewReportResponse = {
  week: {
    start: "2025-03-10",
    end: "2025-03-16",
    currency: "EUR",
    revenue: { current: 48200, previous: 44100 },
    bookings: { current: 138, previous: 124 },
    fleet_utilization: { current: 0.78, previous: 0.74 },
  },
  quarter: {
    code: "2025-Q1",
    comparison_code: "2024-Q1",
    chart: [
      { label: "Ianuarie", current: 182000, previous: 165000 },
      { label: "Februarie", current: 195400, previous: 172500 },
      { label: "Martie", current: 221300, previous: 204000 },
    ],
  },
  links: [
    { slug: "weekly", title: "Raport săptămânal", href: "/admin/reports/weekly" },
    { slug: "monthly", title: "Raport lunar", href: "/admin/reports/monthly" },
    { slug: "quarterly", title: "Raport trimestrial", href: "/admin/reports/quarterly" },
  ],
};

const baseWeekly: WeeklyReportResponse = {
  period: {
    start: "2025-03-10",
    end: "2025-03-16",
    comparison_start: "2025-03-03",
    comparison_end: "2025-03-09",
  },
  totals: {
    currency: "EUR",
    revenue: { current: 48200, previous: 44100 },
    bookings: { current: 138, previous: 124 },
    cancellations: { current: 11, previous: 15 },
    average_duration_days: { current: 4.2, previous: 3.9 },
    yoy: { revenue_ratio: 0.11, bookings_current: 138, bookings_previous: 117 },
  },
  daily_revenue: [
    { label: "L", current: 6200, previous: 5800 },
    { label: "Ma", current: 6700, previous: 6120 },
    { label: "Mi", current: 8200, previous: 7050 },
    { label: "J", current: 7600, previous: 6980 },
    { label: "V", current: 7200, previous: 6890 },
    { label: "S", current: 9300, previous: 8450 },
    { label: "D", current: 7200, previous: 6810 },
  ],
  channel_mix: [
    { label: "Direct", current_percent: 54, previous_percent: 49 },
    { label: "Corporate", current_percent: 26, previous_percent: 24 },
    { label: "OTA", current_percent: 12, previous_percent: 16 },
    { label: "Agenții", current_percent: 8, previous_percent: 11 },
  ],
  occupancy_by_segment: [
    { label: "Economy", current: 0.74, previous: 0.71 },
    { label: "Compact", current: 0.79, previous: 0.75 },
    { label: "SUV", current: 0.88, previous: 0.77 },
    { label: "Premium", current: 0.65, previous: 0.62 },
  ],
  risk_indicators: {
    cancellation_rate: 0.079,
    late_returns_count: 6,
    late_returns_value: 720,
  },
  recommendations: [
    "Activează o campanie flash pentru segmentul economy în weekend pentru a reduce stocul disponibil.",
    "Propune partenerilor corporate un upgrade către SUV în lunile următoare pentru a crește ARPU.",
    "Optimizează paginile de destinație: conversia din trafic organic este 6.4%.",
  ],
};

const baseMonthly: MonthlyReportResponse = {
  period: {
    month: "2025-03",
    label: "Martie 2025",
    comparison: { month: "2025-02", label: "Februarie 2025" },
  },
  financials: {
    currency: "EUR",
    revenue: { current: 221300, previous: 208400 },
    net_profit: { current: 68400, previous: 61200 },
    avg_daily_rate: { current: 74.6, previous: 71.2 },
    fleet_utilization: { current: 0.81, previous: 0.77 },
  },
  bookings: {
    total: { current: 612, previous: 584 },
    corporate_share: { current: 0.34, previous: 0.31 },
    top_cities: [
      { city: "București", current: 212, previous: 201 },
      { city: "Cluj-Napoca", current: 118, previous: 109 },
      { city: "Iași", current: 84, previous: 78 },
    ],
  },
  six_month_trend: [
    { label: "Oct 2024", revenue: 178200, profit: 51400 },
    { label: "Nov 2024", revenue: 186500, profit: 53800 },
    { label: "Dec 2024", revenue: 215300, profit: 64200 },
    { label: "Ian 2025", revenue: 182000, profit: 55600 },
    { label: "Feb 2025", revenue: 195400, profit: 60100 },
    { label: "Mar 2025", revenue: 221300, profit: 68400 },
  ],
  customer_mix: [
    { label: "Direct", current_percent: 48, previous_percent: 44 },
    { label: "Corporate", current_percent: 34, previous_percent: 31 },
    { label: "OTA", current_percent: 11, previous_percent: 15 },
    { label: "Agenții", current_percent: 7, previous_percent: 10 },
  ],
  cost_structure: {
    fleet: { current: 76400, previous: 73100 },
    operations: { current: 29800, previous: 28400 },
    marketing: { current: 18600, previous: 21400 },
    other: { current: 9800, previous: 9400 },
  },
  focus_areas: [
    "Optimizează rotația stocului economy în weekend: gradul de utilizare a scăzut la 72%.",
    "Extinde pachetele corporate în Cluj-Napoca – creștere YoY de 18% la cerere.",
    "Continuă investițiile în remarketing: costul per rezervare s-a redus la 11,4 €.",
  ],
};

const baseQuarterly: QuarterlyReportResponse = {
  period: {
    quarter: "2025-Q1",
    label: "Trimestrul I 2025",
    comparison: { quarter: "2024-Q1", label: "Trimestrul I 2024" },
  },
  kpi: {
    currency: "EUR",
    revenue: { current: 598700, previous: 541500 },
    net_profit: { current: 182400, previous: 168900 },
    ebitda_margin: { current: 0.31, previous: 0.29 },
    fleet_utilization: { current: 0.79, previous: 0.75 },
  },
  quarterly_revenue: [
    { label: "Ianuarie", current: 182000, previous: 165000 },
    { label: "Februarie", current: 195400, previous: 172500 },
    { label: "Martie", current: 221300, previous: 204000 },
  ],
  profit_by_segment: [
    { segment: "Economy", current: 41200, previous: 38600 },
    { segment: "Compact", current: 48200, previous: 45100 },
    { segment: "SUV", current: 61200, previous: 52800 },
    { segment: "Premium", current: 31800, previous: 32400 },
  ],
  fleet_availability: [
    { label: "Activ", current_percent: 82, previous_percent: 79 },
    { label: "Service", current_percent: 9, previous_percent: 11 },
    { label: "Vânzare", current_percent: 5, previous_percent: 6 },
    { label: "Rezervă", current_percent: 4, previous_percent: 4 },
  ],
  strategic_insights: [
    "Segmentul SUV generează 34% din profitul trimestrial și are o rată de ocupare de 88%.",
    "Marjele EBITDA sunt mai ridicate cu 2 pp față de trimestrul precedent datorită optimizării costurilor operaționale.",
    "Recomandare: lansează abonamente corporate în București și Cluj pentru a consolida venituri recurente.",
  ],
};

export const buildOverviewResponse = (
  params: { weekStart?: string | null; quarter?: string | null } = {},
): OverviewReportResponse => {
  const result: OverviewReportResponse = JSON.parse(JSON.stringify(baseOverview));

  if (params.weekStart) {
    const parsedStart = parseIsoDate(params.weekStart);
    if (parsedStart) {
      result.week.start = ensureIsoDate(parsedStart);
      result.week.end = ensureIsoDate(addDays(parsedStart, 6));
    }
  }

  if (params.quarter) {
    const parsed = parseQuarter(params.quarter);
    if (parsed) {
      result.quarter.code = `${parsed.year}-Q${parsed.quarterIndex}`;
      const previous = getQuarterLastYear(parsed.year, parsed.quarterIndex);
      result.quarter.comparison_code = `${previous.year}-Q${previous.quarterIndex}`;
      result.quarter.chart = result.quarter.chart.map((entry, index) => {
        const referenceDate = new Date(parsed.year, parsed.quarterIndex * 3 - 3 + index, 1);
        const label = capitalize(monthFormatterFull.format(referenceDate));
        return { ...entry, label };
      });
    }
  }

  return result;
};

export const buildWeeklyResponse = (
  params: { startDate: string; compareWith?: string | null; customCompareStart?: string | null },
): WeeklyReportResponse => {
  const base = JSON.parse(JSON.stringify(baseWeekly)) as WeeklyReportResponse;
  const startDate = parseIsoDate(params.startDate);
  if (!startDate) {
    throw new Error("Parametrul start_date este invalid");
  }
  const endDate = addDays(startDate, 6);
  base.period.start = ensureIsoDate(startDate);
  base.period.end = ensureIsoDate(endDate);

  const compareMode = params.compareWith ?? "previous_week";
  if (compareMode === "same_week_last_year") {
    const previousYearStart = new Date(startDate);
    previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
    const previousYearEnd = addDays(previousYearStart, 6);
    base.period.comparison_start = ensureIsoDate(previousYearStart);
    base.period.comparison_end = ensureIsoDate(previousYearEnd);
  } else if (compareMode === "custom") {
    const customStart = params.customCompareStart ? parseIsoDate(params.customCompareStart) : null;
    if (!customStart) {
      throw new Error("Parametrul custom_compare_start este obligatoriu pentru comparația custom");
    }
    base.period.comparison_start = ensureIsoDate(customStart);
    base.period.comparison_end = ensureIsoDate(addDays(customStart, 6));
  } else {
    const previousWeekStart = addDays(startDate, -7);
    base.period.comparison_start = ensureIsoDate(previousWeekStart);
    base.period.comparison_end = ensureIsoDate(addDays(previousWeekStart, 6));
  }

  return base;
};

export const buildMonthlyResponse = (
  params: { month: string; compareWith?: string | null; customCompare?: string | null },
): MonthlyReportResponse => {
  const base = JSON.parse(JSON.stringify(baseMonthly)) as MonthlyReportResponse;
  const [yearStr, monthStr] = params.month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    throw new Error("Parametrul month este invalid");
  }

  const monthDate = new Date(year, monthIndex - 1, 1);
  base.period.month = `${year.toString().padStart(4, "0")}-${monthIndex.toString().padStart(2, "0")}`;
  base.period.label = capitalize(monthFormatter.format(monthDate));

  const compareMode = params.compareWith ?? "previous_month";
  if (compareMode === "same_month_last_year") {
    const previousYear = new Date(monthDate);
    previousYear.setFullYear(previousYear.getFullYear() - 1);
    base.period.comparison.month = `${previousYear.getFullYear()}-${(previousYear.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    base.period.comparison.label = capitalize(monthFormatter.format(previousYear));
  } else if (compareMode === "custom") {
    if (!params.customCompare) {
      throw new Error("Parametrul custom_compare este obligatoriu pentru comparația custom");
    }
    base.period.comparison.month = params.customCompare;
    base.period.comparison.label = formatMonthLabel(params.customCompare);
  } else {
    const previousMonth = new Date(monthDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    base.period.comparison.month = `${previousMonth.getFullYear()}-${(previousMonth.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    base.period.comparison.label = capitalize(monthFormatter.format(previousMonth));
  }

  base.six_month_trend = base.six_month_trend.map((entry, index) => {
    const trendDate = new Date(monthDate);
    trendDate.setMonth(trendDate.getMonth() - (base.six_month_trend.length - 1 - index));
    const label = capitalize(monthFormatterShort.format(trendDate));
    return { ...entry, label: `${label} ${trendDate.getFullYear()}` };
  });

  return base;
};

export const buildQuarterlyResponse = (
  params: { quarter: string; compareWith?: string | null; customCompare?: string | null },
): QuarterlyReportResponse => {
  const base = JSON.parse(JSON.stringify(baseQuarterly)) as QuarterlyReportResponse;
  const parsed = parseQuarter(params.quarter);
  if (!parsed) {
    throw new Error("Parametrul quarter este invalid");
  }

  base.period.quarter = `${parsed.year}-Q${parsed.quarterIndex}`;
  base.period.label = formatQuarterLabel(parsed.year, parsed.quarterIndex);

  const compareMode = params.compareWith ?? "same_quarter_last_year";
  if (compareMode === "previous_quarter") {
    const previous = getPreviousQuarter(parsed.year, parsed.quarterIndex);
    base.period.comparison.quarter = `${previous.year}-Q${previous.quarterIndex}`;
    base.period.comparison.label = formatQuarterLabel(previous.year, previous.quarterIndex);
  } else if (compareMode === "custom") {
    if (!params.customCompare) {
      throw new Error("Parametrul custom_compare este obligatoriu pentru comparația custom");
    }
    const custom = parseQuarter(params.customCompare);
    if (!custom) {
      throw new Error("Valoarea custom_compare este invalidă");
    }
    base.period.comparison.quarter = `${custom.year}-Q${custom.quarterIndex}`;
    base.period.comparison.label = formatQuarterLabel(custom.year, custom.quarterIndex);
  } else {
    const previousYear = getQuarterLastYear(parsed.year, parsed.quarterIndex);
    base.period.comparison.quarter = `${previousYear.year}-Q${previousYear.quarterIndex}`;
    base.period.comparison.label = formatQuarterLabel(previousYear.year, previousYear.quarterIndex);
  }

  base.quarterly_revenue = base.quarterly_revenue.map((entry, index) => {
    const monthDate = new Date(parsed.year, parsed.quarterIndex * 3 - 3 + index, 1);
    const label = capitalize(monthFormatterFull.format(monthDate));
    return { ...entry, label };
  });

  return base;
};
