export interface AdminReportOverviewParams {
  week_start?: string;
  quarter?: string;
  timezone?: string;
}

export interface AdminReportWeekKpi {
  start: string;
  end: string;
  currency: string;
  revenue: {
    current: number;
    previous: number;
  };
  bookings: {
    current: number;
    previous: number;
  };
  fleet_utilization: {
    current: number;
    previous: number;
  };
}

export interface AdminReportQuarterChartPoint {
  label: string;
  current: number;
  previous: number;
}

export interface AdminReportOverviewQuarter {
  code: string;
  comparison_code: string;
  chart: AdminReportQuarterChartPoint[];
}

export interface AdminReportOverviewLink {
  slug: string;
  title: string;
  href: string;
}

export interface AdminReportOverviewResponse {
  week: AdminReportWeekKpi;
  quarter: AdminReportOverviewQuarter;
  links: AdminReportOverviewLink[];
}

export interface AdminReportWeeklyParams {
  start_date: string;
  compare_with?: "previous_week" | "same_week_last_year" | "custom";
  custom_compare_start?: string;
  timezone?: string;
}

export interface AdminReportWeeklyPeriod {
  start: string;
  end: string;
  comparison_start: string;
  comparison_end: string;
}

export interface AdminReportWeeklyTotals {
  currency: string;
  revenue: {
    current: number;
    previous: number;
  };
  bookings: {
    current: number;
    previous: number;
  };
  cancellations: {
    current: number;
    previous: number;
  };
  average_duration_days: {
    current: number;
    previous: number;
  };
  yoy: {
    revenue_ratio: number;
    bookings_current: number;
    bookings_previous: number;
  };
}

export interface AdminReportWeeklyDailyRevenuePoint {
  label: string;
  current: number;
  previous: number;
}

export interface AdminReportWeeklyChannelMixItem {
  label: string;
  current_percent: number;
  previous_percent: number;
}

export interface AdminReportWeeklyOccupancyItem {
  label: string;
  current: number;
  previous: number;
}

export interface AdminReportWeeklyRiskIndicators {
  cancellation_rate: number;
  late_returns_count: number;
  late_returns_value: number;
}

export interface AdminReportWeeklyResponse {
  period: AdminReportWeeklyPeriod;
  totals: AdminReportWeeklyTotals;
  daily_revenue: AdminReportWeeklyDailyRevenuePoint[];
  channel_mix: AdminReportWeeklyChannelMixItem[];
  occupancy_by_segment: AdminReportWeeklyOccupancyItem[];
  risk_indicators: AdminReportWeeklyRiskIndicators;
  recommendations: string[];
}

export interface AdminReportMonthlyParams {
  month: string;
  compare_with?: "previous_month" | "same_month_last_year" | "custom";
  custom_compare?: string;
  timezone?: string;
}

export interface AdminReportMonthlyPeriod {
  month: string;
  label: string;
  comparison: {
    month: string;
    label: string;
  };
}

export interface AdminReportMonthlyFinancials {
  currency: string;
  revenue: {
    current: number;
    previous: number;
  };
  net_profit: {
    current: number;
    previous: number;
  };
  avg_daily_rate: {
    current: number;
    previous: number;
  };
  fleet_utilization: {
    current: number;
    previous: number;
  };
}

export interface AdminReportMonthlyBookings {
  total: {
    current: number;
    previous: number;
  };
  corporate_share: {
    current: number;
    previous: number;
  };
  top_cities: {
    city: string;
    current: number;
    previous: number;
  }[];
}

export interface AdminReportMonthlyTrendPoint {
  label: string;
  revenue: number;
  profit: number;
}

export interface AdminReportMonthlyCustomerMixItem {
  label: string;
  current_percent: number;
  previous_percent: number;
}

export interface AdminReportMonthlyCostStructure {
  fleet: {
    current: number;
    previous: number;
  };
  operations: {
    current: number;
    previous: number;
  };
  marketing: {
    current: number;
    previous: number;
  };
  other: {
    current: number;
    previous: number;
  };
}

export interface AdminReportMonthlyResponse {
  period: AdminReportMonthlyPeriod;
  financials: AdminReportMonthlyFinancials;
  bookings: AdminReportMonthlyBookings;
  six_month_trend: AdminReportMonthlyTrendPoint[];
  customer_mix: AdminReportMonthlyCustomerMixItem[];
  cost_structure: AdminReportMonthlyCostStructure;
  focus_areas: string[];
}

export interface AdminReportQuarterlyParams {
  quarter: string;
  compare_with?: "previous_quarter" | "same_quarter_last_year" | "custom";
  custom_compare?: string;
  timezone?: string;
}

export interface AdminReportQuarterlyPeriod {
  quarter: string;
  label: string;
  comparison: {
    quarter: string;
    label: string;
  };
}

export interface AdminReportQuarterlyKpi {
  currency: string;
  revenue: {
    current: number;
    previous: number;
  };
  net_profit: {
    current: number;
    previous: number;
  };
  ebitda_margin: {
    current: number;
    previous: number;
  };
  fleet_utilization: {
    current: number;
    previous: number;
  };
}

export interface AdminReportQuarterlyRevenuePoint {
  label: string;
  current: number;
  previous: number;
}

export interface AdminReportQuarterlyProfitSegment {
  segment: string;
  current: number;
  previous: number;
}

export interface AdminReportQuarterlyFleetAvailabilityItem {
  label: string;
  current_percent: number;
  previous_percent: number;
}

export interface AdminReportQuarterlyResponse {
  period: AdminReportQuarterlyPeriod;
  kpi: AdminReportQuarterlyKpi;
  quarterly_revenue: AdminReportQuarterlyRevenuePoint[];
  profit_by_segment: AdminReportQuarterlyProfitSegment[];
  fleet_availability: AdminReportQuarterlyFleetAvailabilityItem[];
  strategic_insights: string[];
}

export interface AdminReportAnnualParams {
  year: string;
  compare_with?: "previous_year" | "custom";
  custom_compare?: string;
  timezone?: string;
}

export interface AdminReportAnnualPeriod {
  year: string;
  label: string;
  comparison: {
    year: string;
    label: string;
  };
}

export interface AdminReportAnnualExecutiveSummary {
  currency: string;
  revenue: {
    current: number;
    previous: number;
  };
  net_profit: {
    current: number;
    previous: number;
  };
  bookings: {
    current: number;
    previous: number;
  };
  average_booking_value: {
    current: number;
    previous: number;
  };
  average_daily_rate: {
    current: number;
    previous: number;
  };
  fleet_utilization: {
    current: number;
    previous: number;
  };
  cancellation_rate: {
    current: number;
    previous: number;
  };
  lead_time_days: {
    average: number;
    median: number;
    p90: number;
  };
}

export interface AdminReportAnnualQuarterBreakdownItem {
  quarter: string;
  label: string;
  revenue: {
    current: number;
    previous: number;
    growth_ratio: number;
  };
  net_profit: {
    current: number;
    previous: number;
    growth_ratio: number;
  };
  bookings: {
    current: number;
    previous: number;
    growth_ratio: number;
  };
  fleet_utilization: number;
  average_daily_rate: {
    current: number;
    previous: number;
  };
}

export interface AdminReportAnnualSegmentPerformanceItem {
  segment: string;
  revenue: {
    current: number;
    previous: number;
  };
  net_profit: {
    current: number;
    previous: number;
    growth_ratio: number;
  };
  share: number;
}

export interface AdminReportAnnualSegmentPerformance {
  segments: AdminReportAnnualSegmentPerformanceItem[];
  totals: {
    revenue: number;
    net_profit: number;
  };
}

export interface AdminReportAnnualCityPerformance {
  top_cities: {
    city: string;
    current: number;
    previous: number;
    growth_ratio: number;
  }[];
  growth_leaders: {
    city: string;
    current: number;
    previous: number;
    growth_ratio: number;
  }[];
}

export interface AdminReportAnnualChannelMixItem {
  label: string;
  current_percent: number;
  previous_percent: number;
}

export interface AdminReportAnnualChannelYoYItem {
  label: string;
  delta_percent: number;
}

export interface AdminReportAnnualChannelPerformance {
  mix: AdminReportAnnualChannelMixItem[];
  year_over_year: AdminReportAnnualChannelYoYItem[];
  dominant_channel: {
    label: string;
    current_percent: number;
    delta_percent: number;
  };
}

export interface AdminReportAnnualCustomerInsights {
  new_customers: {
    unique: number;
    bookings: number;
    revenue: number;
  };
  repeat_customers: {
    unique: number;
    bookings: number;
    revenue: number;
  };
  repeat_ratio: number;
  repeat_revenue_share: number;
  average_repeat_booking_value: number;
}

export interface AdminReportAnnualOperationalHealth {
  cancellations: {
    current_count: number;
    previous_count: number;
    current_rate: number;
    previous_rate: number;
  };
  average_rental_duration_days: {
    current: number;
    previous: number;
  };
  fleet_utilization: {
    current: number;
    previous: number;
  };
}

export interface AdminReportAnnualResponse {
  period: AdminReportAnnualPeriod;
  executive_summary: AdminReportAnnualExecutiveSummary;
  quarter_breakdown: AdminReportAnnualQuarterBreakdownItem[];
  segment_performance: AdminReportAnnualSegmentPerformance;
  city_performance: AdminReportAnnualCityPerformance;
  channel_performance: AdminReportAnnualChannelPerformance;
  customer_insights: AdminReportAnnualCustomerInsights;
  operational_health: AdminReportAnnualOperationalHealth;
  strategic_recommendations: string[];
}
