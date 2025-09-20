import type { CarLookup } from "@/types/car";

export type ExpenseType =
  | "spalat"
  | "parcare"
  | "service"
  | "casa"
  | "marketing"
  | "altele"
  | (string & {});

export interface ExpenseRecurrence {
  id: number;
  type: ExpenseType;
  day_of_month?: number | string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  last_generated_period?: string | null;
  [key: string]: unknown;
}

export interface Expense {
  id: number;
  type: ExpenseType;
  description?: string | null;
  amount: number | string;
  car_id?: number | string | null;
  spent_at: string;
  is_recurring?: boolean | number | string;
  ends_on?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  recurrence?: ExpenseRecurrence | null;
  car?: CarLookup | null;
  [key: string]: unknown;
}

export interface ExpenseListParams {
  page?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  type?: ExpenseType | string;
  car_id?: number | string;
  is_recurring?: boolean | number | string;
  include?: string | readonly string[];
  [key: string]: unknown;
}

export type ExpensePayload = Partial<{
  type: ExpenseType | string;
  description: string | null;
  amount: number | string;
  spent_at: string;
  car_id: number | string | null;
  is_recurring: boolean | number | string;
  ends_on: string | null;
}> &
  Record<string, unknown>;
