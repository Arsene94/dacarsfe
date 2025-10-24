export type CarCashflowDirection = "income" | "expense";

export type CarCashflowPaymentMethod = "cash" | "card" | "cash_card";

export type CarCashflowExpenseType =
  | "car"
  | "house"
  | "parking_wash"
  | "marketing"
  | "company_operations"
  | "salary"
  | "fuel"
  | "other";

export interface CarCashflowUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  username?: string | null;
}

export interface CarCashflowCar {
  id: number;
  name?: string | null;
  license_plate?: string | null;
}

export interface CarCashflowRecord {
  id: number;
  car_id: number | null;
  direction: CarCashflowDirection;
  expense_type?: CarCashflowExpenseType | null;
  category?: string | null;
  description?: string | null;
  payment_method: CarCashflowPaymentMethod;
  total_amount: number;
  cash_amount?: number | null;
  card_amount?: number | null;
  occurred_on: string;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: number | null;
  created_by_user?: CarCashflowUser | null;
  car?: CarCashflowCar | null;
}

export interface CarCashflowPayload {
  car_id?: number | null;
  direction: CarCashflowDirection;
  expense_type?: CarCashflowExpenseType | null;
  payment_method: CarCashflowPaymentMethod;
  total_amount: number;
  occurred_on: string;
  category?: string | null;
  description?: string | null;
  cash_amount?: number | null;
  card_amount?: number | null;
  created_by?: number | null;
}

export interface CarCashflowListParams extends Record<string, unknown> {
  car_id?: number;
  direction?: CarCashflowDirection;
  expense_type?: CarCashflowExpenseType | string;
  payment_method?: CarCashflowPaymentMethod;
  created_by?: number;
  occurred_on_date?: string;
  occurred_on_month?: string;
  created_date?: string;
  created_month?: string;
  include?: string | readonly string[];
  page?: number;
  per_page?: number;
}
