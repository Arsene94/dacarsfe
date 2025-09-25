export interface OverviewReportLink {
  slug: string;
  title: string;
  href: string;
}

export interface OverviewReportResponse {
  week: {
    start: string;
    end: string;
    currency: string;
    revenue: { current: number; previous: number };
    bookings: { current: number; previous: number };
    fleet_utilization: { current: number; previous: number };
  };
  quarter: {
    code: string;
    comparison_code: string;
    chart: Array<{ label: string; current: number; previous: number }>;
  };
  links: OverviewReportLink[];
}

export interface WeeklyReportResponse {
  period: {
    start: string;
    end: string;
    comparison_start: string;
    comparison_end: string;
  };
  totals: {
    currency: string;
    revenue: { current: number; previous: number };
    bookings: { current: number; previous: number };
    cancellations: { current: number; previous: number };
    average_duration_days: { current: number; previous: number };
    yoy: { revenue_ratio: number; bookings_current: number; bookings_previous: number };
  };
  daily_revenue: Array<{ label: string; current: number; previous: number }>;
  channel_mix: Array<{ label: string; current_percent: number; previous_percent: number }>;
  occupancy_by_segment: Array<{ label: string; current: number; previous: number }>;
  risk_indicators: {
    cancellation_rate: number;
    late_returns_count: number;
    late_returns_value: number;
  };
  recommendations: string[];
}

export interface MonthlyReportResponse {
  period: {
    month: string;
    label: string;
    comparison: { month: string; label: string };
  };
  financials: {
    currency: string;
    revenue: { current: number; previous: number };
    net_profit: { current: number; previous: number };
    avg_daily_rate: { current: number; previous: number };
    fleet_utilization: { current: number; previous: number };
  };
  bookings: {
    total: { current: number; previous: number };
    corporate_share: { current: number; previous: number };
    top_cities: Array<{ city: string; current: number; previous: number }>;
  };
  six_month_trend: Array<{ label: string; revenue: number; profit: number }>;
  customer_mix: Array<{ label: string; current_percent: number; previous_percent: number }>;
  cost_structure: {
    fleet: { current: number; previous: number };
    operations: { current: number; previous: number };
    marketing: { current: number; previous: number };
    other: { current: number; previous: number };
  };
  focus_areas: string[];
}

export interface QuarterlyReportResponse {
  period: {
    quarter: string;
    label: string;
    comparison: { quarter: string; label: string };
  };
  kpi: {
    currency: string;
    revenue: { current: number; previous: number };
    net_profit: { current: number; previous: number };
    ebitda_margin: { current: number; previous: number };
    fleet_utilization: { current: number; previous: number };
  };
  quarterly_revenue: Array<{ label: string; current: number; previous: number }>;
  profit_by_segment: Array<{ segment: string; current: number; previous: number }>;
  fleet_availability: Array<{ label: string; current_percent: number; previous_percent: number }>;
  strategic_insights: string[];
}
