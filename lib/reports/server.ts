import { headers } from "next/headers";
import type {
  MonthlyReportResponse,
  OverviewReportResponse,
  QuarterlyReportResponse,
  WeeklyReportResponse,
} from "@/types/reports";

const resolveBaseUrl = (): string => {
  const envBase = process.env.REPORTS_API_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (envBase) {
    return envBase;
  }
  const headersList = headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  return `${protocol}://${host}`;
};

const toUrl = (path: string, params?: Record<string, string | null | undefined>): string => {
  const base = resolveBaseUrl();
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim().length > 0) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Cererea către ${url} a eșuat cu status ${response.status}`);
  }
  return (await response.json()) as T;
};

export const getReportsOverview = async (
  params?: { week_start?: string | null; quarter?: string | null },
): Promise<OverviewReportResponse> => {
  const url = toUrl("/api/admin/reports/overview", params);
  return fetchJson<OverviewReportResponse>(url);
};

export const getWeeklyReport = async (
  params: {
    start_date: string;
    compare_with?: string | null;
    custom_compare_start?: string | null;
  },
): Promise<WeeklyReportResponse> => {
  const url = toUrl("/api/admin/reports/weekly", params);
  return fetchJson<WeeklyReportResponse>(url);
};

export const getMonthlyReport = async (
  params: {
    month: string;
    compare_with?: string | null;
    custom_compare?: string | null;
  },
): Promise<MonthlyReportResponse> => {
  const url = toUrl("/api/admin/reports/monthly", params);
  return fetchJson<MonthlyReportResponse>(url);
};

export const getQuarterlyReport = async (
  params: {
    quarter: string;
    compare_with?: string | null;
    custom_compare?: string | null;
  },
): Promise<QuarterlyReportResponse> => {
  const url = toUrl("/api/admin/reports/quarterly", params);
  return fetchJson<QuarterlyReportResponse>(url);
};
