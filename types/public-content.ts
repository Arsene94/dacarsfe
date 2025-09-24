import type { UnknownRecord } from "./api";

export type PublicLocale =
  | "ro"
  | "en"
  | (string & { readonly brand?: never });

export type PublicContentStatus = "draft" | "published" | "archived";

export type PublicContentDictionary = Record<string, unknown>;

export interface PublicContentResponse {
  locale: PublicLocale;
  version?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  fallback_locale?: PublicLocale | null;
  status?: PublicContentStatus | null;
  sections?: string[] | null;
  content?: PublicContentDictionary | null;
  meta?: UnknownRecord | null;
}

export interface PublicContentRequestParams {
  locale?: PublicLocale;
  fallbackLocale?: PublicLocale | null;
  sections?: string | readonly string[];
  version?: string | null;
  previewToken?: string | null;
  includeDraft?: boolean | null;
}

export interface UpdatePublicContentPayload {
  locale: PublicLocale;
  content: PublicContentDictionary;
  version?: string | null;
  status?: PublicContentStatus | null;
  publish?: boolean | null;
}

export interface PublishPublicContentPayload {
  locale: PublicLocale;
  version?: string | null;
}

export interface AdminPublicContentSnapshotPayload {
  locale: PublicLocale;
  sections: readonly string[];
  content: PublicContentDictionary;
  version?: string | null;
  updated_at?: string | null;
}

