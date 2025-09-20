export interface Tax {
  id: number;
  name: string;
  percentage: number;
  status?: string | null;
  priority?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export type TaxPayload = Partial<{
  name: string;
  percentage: number;
  status: string | null;
  priority: number | null;
}> & Record<string, unknown>;

export interface TaxListParams {
  page?: number;
  perPage?: number;
  limit?: number;
  status?: string;
  name_like?: string;
}

export interface TaxTranslation {
  lang_code: string;
  name?: string | null;
  [key: string]: unknown;
}
