import type { NextRequest } from "next/server";
import { sha256Node, normalizeForHash } from "@/lib/crypto/hash";
import { getFbc, getFbp } from "@/lib/cookies/fbp_fbc";

export type LeadUserDataInput = {
  em?: string | string[] | null;
  ph?: string | string[] | number | null;
  lead_id?: string | number | null;
  external_id?: string | number | null;
  fbc?: string | null;
  fbp?: string | null;
  client_user_agent?: string | null;
  client_ip_address?: string | null;
  hashed?: boolean;
  is_hashed?: boolean;
  isHashed?: boolean;
  [key: string]: unknown;
};

export type LeadCustomData = {
  event_source?: string;
  lead_event_source?: string;
  [key: string]: unknown;
};

export interface LeadServerPayload {
  event_name: string;
  event_time: number | string;
  action_source: string;
  user_data: LeadUserDataInput;
  custom_data: LeadCustomData;
  event_id?: string | null;
  test_event_code?: string | null;
  attribution_data?: Record<string, unknown> | null;
  original_event_data?: Record<string, unknown> | null;
}

export interface SendLeadOptions {
  request?: NextRequest;
  accessToken?: string;
  datasetId?: string;
  apiVersion?: string;
}

export interface SendLeadResult {
  ok: boolean;
  status: number;
  meta: unknown;
}

type GraphResponse = {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  [key: string]: unknown;
};

const DATASET_ENV = "META_DATASET_ID";
const TOKEN_ENV = "META_ACCESS_TOKEN";
const VERSION_ENV = "META_API_VERSION";

const RETRY_DELAYS = [300, 1200];

function ensureEventName(value: string): string {
  return value?.trim() || "Lead";
}

function ensureEventTime(value: number | string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      const parsed = Number.parseInt(trimmed, 10);
      if (Number.isFinite(parsed)) {
        return Math.floor(parsed);
      }
    }
  }

  return Math.floor(Date.now() / 1000);
}

function ensureActionSource(value: string): string {
  const trimmed = value?.trim();
  return trimmed || "system_generated";
}

function normalizeLeadId(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const digits = String(value).replace(/\D+/g, "");
  if (digits.length < 15 || digits.length > 17) {
    return undefined;
  }

  return digits;
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" || typeof entry === "number" ? String(entry) : ""))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string" || typeof value === "number") {
    const trimmed = String(value).trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function hashEmails(values: string[], alreadyHashed: boolean): string[] {
  if (alreadyHashed) {
    return values.map((value) => normalizeForHash(value)).filter((value) => value.length > 0);
  }

  return values.map((value) => sha256Node(value)).filter((value) => value.length > 0);
}

function hashPhones(values: string[], alreadyHashed: boolean): string[] {
  if (alreadyHashed) {
    return values.map((value) => normalizeForHash(value)).filter((value) => value.length > 0);
  }

  return values
    .map((value) => value.replace(/\D+/g, ""))
    .map((digits) => (digits ? sha256Node(digits) : ""))
    .filter((value) => value.length > 0);
}

function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneUndefined(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  if (value && typeof value === "object") {
    if (value === null) {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (typeof raw === "undefined") {
        continue;
      }

      const pruned = pruneUndefined(raw);
      if (typeof pruned === "undefined") {
        continue;
      }

      result[key] = pruned;
    }

    return result as unknown as T;
  }

  return value;
}

function buildUserData(payload: LeadUserDataInput, request?: NextRequest): Record<string, unknown> {
  const alreadyHashed = Boolean(payload.hashed ?? payload.is_hashed ?? payload.isHashed);
  const userData: Record<string, unknown> = {};

  const emails = hashEmails(asArray(payload.em), alreadyHashed);
  if (emails.length === 1) {
    userData.em = emails[0];
  } else if (emails.length > 1) {
    userData.em = emails;
  }

  const phones = hashPhones(asArray(payload.ph), alreadyHashed);
  if (phones.length === 1) {
    userData.ph = phones[0];
  } else if (phones.length > 1) {
    userData.ph = phones;
  }

  const leadId = normalizeLeadId(payload.lead_id);
  if (leadId) {
    userData.lead_id = leadId;
  }

  const externalId = payload.external_id;
  if (externalId !== null && externalId !== undefined) {
    const normalized = String(externalId).trim();
    if (normalized) {
      userData.external_id = normalized;
    }
  }

  const clientUserAgent = typeof payload.client_user_agent === "string" ? payload.client_user_agent.trim() : "";
  if (clientUserAgent) {
    userData.client_user_agent = clientUserAgent;
  }

  const clientIp = typeof payload.client_ip_address === "string" ? payload.client_ip_address.trim() : "";
  if (clientIp) {
    userData.client_ip_address = clientIp;
  }

  let fbp = typeof payload.fbp === "string" ? payload.fbp.trim() : "";
  if (!fbp && request) {
    fbp = getFbp(request.headers) ?? "";
  }
  if (fbp) {
    userData.fbp = fbp;
  }

  let fbc = typeof payload.fbc === "string" ? payload.fbc.trim() : "";
  if (!fbc && request) {
    fbc = getFbc(request.url, request.headers) ?? "";
  }
  if (fbc) {
    userData.fbc = fbc;
  }

  return pruneUndefined(userData);
}

function buildCustomData(custom: LeadCustomData): Record<string, unknown> {
  const { event_source: rawEventSource, lead_event_source: rawLeadEventSource, ...rest } = custom ?? {};
  const eventSource = typeof rawEventSource === "string" && rawEventSource.trim().length > 0 ? rawEventSource.trim() : "crm";
  const leadEventSource =
    typeof rawLeadEventSource === "string" && rawLeadEventSource.trim().length > 0 ? rawLeadEventSource.trim() : "DaCars";

  return pruneUndefined({
    event_source: eventSource,
    lead_event_source: leadEventSource,
    ...rest,
  });
}

function wait(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export async function sendLead(payload: LeadServerPayload, options?: SendLeadOptions): Promise<SendLeadResult> {
  const accessToken = options?.accessToken ?? process.env[TOKEN_ENV]?.trim();
  const datasetId = options?.datasetId ?? process.env[DATASET_ENV]?.trim();
  const apiVersion = options?.apiVersion ?? process.env[VERSION_ENV]?.trim() ?? "v24.0";

  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN nu este configurat");
  }

  if (!datasetId) {
    throw new Error("META_DATASET_ID nu este configurat");
  }

  const userData = buildUserData(payload.user_data ?? {}, options?.request);
  const customData = buildCustomData(payload.custom_data ?? {});
  const eventName = ensureEventName(payload.event_name);
  const eventTime = ensureEventTime(payload.event_time);
  const actionSource = ensureActionSource(payload.action_source);
  const eventId = typeof payload.event_id === "string" && payload.event_id.trim().length > 0 ? payload.event_id.trim() : undefined;
  const testEventCode = typeof payload.test_event_code === "string" && payload.test_event_code.trim().length > 0
    ? payload.test_event_code.trim()
    : undefined;

  const eventPayload = pruneUndefined({
    event_name: eventName,
    event_time: eventTime,
    action_source: actionSource,
    event_id: eventId,
    user_data: userData,
    custom_data: customData,
    attribution_data: payload.attribution_data ?? undefined,
    original_event_data: payload.original_event_data ?? undefined,
  });

  const body = pruneUndefined({
    data: [eventPayload],
    test_event_code: testEventCode,
  });

  const url = new URL(`https://graph.facebook.com/${apiVersion}/${datasetId}/events`);
  url.searchParams.set("access_token", accessToken);

  const maxAttempts = 1 + RETRY_DELAYS.length;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        keepalive: true,
      });

      const responseBody: GraphResponse | undefined = await response
        .json()
        .catch(() => undefined);

      console.info("[Meta CAPI] Lead event response", {
        status: response.status,
        ok: response.ok,
        eventId: eventId ?? null,
        body: responseBody,
      });

      if (!response.ok && response.status >= 500 && response.status < 600 && attempt < maxAttempts - 1) {
        await wait(RETRY_DELAYS[attempt]);
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        meta: responseBody,
      };
    } catch (error) {
      lastError = error;
      console.error("[Meta CAPI] Lead event request error", {
        eventId: eventId ?? null,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt < maxAttempts - 1) {
        await wait(RETRY_DELAYS[attempt]);
        continue;
      }

      break;
    }
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  throw new Error("Meta CAPI nu a returnat un răspuns valid");
}
