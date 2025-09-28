export type ActivityType = "cleaning" | "delivery";

export interface ActivityRecord {
  id: number;
  car_id: number;
  car_plate: string;
  performed_at: string;
  type: ActivityType;
  amount: number;
  notes: string | null;
  is_paid: boolean;
  paid_at: string | null;
  paid_by: number | null;
  paid_by_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityPayload {
  car_id: number;
  performed_at: string;
  type: ActivityType;
  notes?: string | null;
}

export interface ActivityListParams extends Record<string, unknown> {
  week?: string;
  from?: string;
  to?: string;
  car_id?: number;
  type?: ActivityType;
  created_by?: number;
  paid_by?: number;
  is_paid?: boolean;
  page?: number;
  per_page?: number;
}

export interface ActivityWeeklySummaryBreakdownEntry {
  count: number;
  amount: number;
}

export interface ActivityWeeklySummaryDayEntry {
  date: string;
  count: number;
  amount: number;
}

export interface ActivityWeeklySummary {
  week: string;
  start_date: string;
  end_date: string;
  activities_count: number;
  amount_per_activity: number;
  total_amount: number;
  breakdown_by_type: Partial<Record<ActivityType, ActivityWeeklySummaryBreakdownEntry>>;
  breakdown_by_day: ActivityWeeklySummaryDayEntry[];
}

export interface ActivityWeeklySummaryParams extends Record<string, unknown> {
  week?: string;
  car_id?: number;
}

export type ActivityMarkPaidPayload =
  | {
      week: string;
      until?: never;
      car_id?: number;
    }
  | {
      until: string;
      week?: never;
      car_id?: number;
    }
  | {
      activity_ids: number[];
      week?: never;
      until?: never;
      car_id?: number;
    };

export interface ActivityMarkPaidResponse {
  mode: "week" | "until";
  marked_count: number;
  paid_at: string;
  range: {
    start_date: string | null;
    end_date: string | null;
    week: string | null;
  };
  car_id?: number;
}

export interface ActivityWeeklySummaryDispatchPayload {
  week?: string;
  channel: "email" | "slack" | "whatsapp";
  recipients?: string[];
  include_breakdown?: boolean;
}

export interface ActivityWeeklySummaryDispatchResponse {
  week: string;
  channel: "email" | "slack" | "whatsapp";
  recipients?: string[];
  queued_job_id: string;
}
