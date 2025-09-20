export type AdminMetricPeriod =
  | "created"
  | "start"
  | "end"
  | (string & {});

export interface AdminBookingsTodayParams {
  by?: AdminMetricPeriod;
  statuses?: string | string[];
}

export interface AdminBookingsTodayMetrics {
  date?: string | null;
  by?: string | null;
  statuses?: string[] | string | null;
  count: number;
  [key: string]: unknown;
}

export interface AdminCarsTotalParams {
  status?: string;
}

export interface AdminCarsTotalMetrics {
  status?: string | null;
  count: number;
  [key: string]: unknown;
}

export interface AdminBookingsTotalParams {
  statuses?: string | string[];
}

export interface AdminBookingsTotalMetrics {
  statuses?: string[] | string | null;
  count: number;
  [key: string]: unknown;
}
