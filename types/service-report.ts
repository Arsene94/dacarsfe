import type { CarLookup } from "@/types/car";

export interface ServiceReport {
  id: number;
  mechanic_name: string;
  serviced_at: string;
  car_id?: number | string | null;
  odometer_km?: number | string | null;
  oil_type?: string | null;
  work_performed?: string | null;
  observations?: string | null;
  service_date?: string | null;
  service_time?: string | null;
  car?: CarLookup | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface ServiceReportListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  car_id?: number | string;
  mechanic_name?: string;
  include?: string | readonly string[];
  [key: string]: unknown;
}

export type ServiceReportPayload = Partial<{
  mechanic_name: string;
  serviced_at: string;
  car_id: number | string | null;
  odometer_km: number | string | null;
  oil_type: string | null;
  work_performed: string | null;
  observations: string | null;
}> &
  Record<string, unknown>;
