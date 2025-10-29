export type ApiIdentifier = number | string;

export interface ApiMeta {
  current_page?: number;
  currentPage?: number;
  per_page?: number;
  perPage?: number;
  total?: number;
  count?: number;
  last_page?: number;
  lastPage?: number;
  from?: number;
  to?: number;
  [key: string]: unknown;
}

export interface ApiLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
  [key: string]: unknown;
}

export interface ApiListResponse<T> {
  data?: T[];
  items?: T[];
  results?: T[];
  payload?: T[];
  meta?: ApiMeta;
  pagination?: ApiMeta;
  links?: ApiLinks;
  total?: number;
  count?: number;
  last_page?: number;
  lastPage?: number;
  [key: string]: unknown;
}

export type ApiListResult<T> = ApiListResponse<T> | T[];

export interface ApiItemResponse<T> {
  data?: T;
  item?: T;
  resource?: T;
  result?: T;
  car?: T;
  booking?: T;
  user?: T;
  role?: T;
  [key: string]: unknown;
}

export type ApiItemResult<T> = ApiItemResponse<T> | T;

export interface ApiMessageResponse {
  message?: string;
  success?: boolean;
  [key: string]: unknown;
}

export type ApiDeleteResponse = ApiMessageResponse;

export type UnknownRecord = Record<string, unknown>;

export interface LookupRecord extends UnknownRecord {
  id?: number | string;
  name?: string | null;
  title?: string | null;
  label?: string | null;
}

export interface TranslationBatchStatus extends UnknownRecord {
  id?: string;
  status?: string;
  queued_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  total?: number | Record<string, number> | null;
  processed?: number | Record<string, number> | null;
  pending?: number | Record<string, number> | null;
  failed?: number | Record<string, number> | null;
  message?: string | null;
}
