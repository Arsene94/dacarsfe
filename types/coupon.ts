export type CouponType =
  | "percent"
  | "percentage"
  | "percent_off"
  | "fixed"
  | (string & {});

export interface Coupon {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  is_unlimited: boolean;
  is_unlimited_expires?: boolean | null;
  expires_at?: string | null;
  limit?: number | null;
  limited_to_email?: string | null;
  used?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type CouponPayload = Partial<{
  code: string;
  type: CouponType;
  value: number;
  is_unlimited: boolean;
  is_unlimited_expires: boolean;
  expires_at: string | null;
  limit: number | null;
  limited_to_email: string | null;
  used: number | null;
}> & Record<string, unknown>;

export interface CouponListParams {
  page?: number;
  perPage?: number;
  limit?: number;
  search?: string;
  code_like?: string;
  type?: CouponType;
  is_unlimited?: string | number | boolean;
  is_unlimited_expires?: string | number | boolean;
}

export interface CouponQuickValidationParams {
  code: string;
  sub_total?: number | string;
  [key: string]: unknown;
}

export interface CouponQuickValidationResponse {
  valid: boolean;
  amount?: number;
  type?: CouponType;
  value?: number;
  message?: string;
  [key: string]: unknown;
}
