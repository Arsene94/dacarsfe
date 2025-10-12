import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sendLead, type LeadCustomData, type LeadServerPayload, type LeadUserDataInput } from "@/lib/capi/sendLead";

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

function sanitizeUserData(input: Record<string, unknown>): LeadUserDataInput {
  const hashedIndicator =
    input.hashed ??
    input.is_hashed ??
    (input as { isHashed?: unknown }).isHashed ??
    (input as { hash?: unknown }).hash ??
    (input as { isHashedUserData?: unknown }).isHashedUserData;
  const hashedFlag = Boolean(hashedIndicator);

  const userData: LeadUserDataInput = {
    hashed: hashedFlag,
  };

  if ("em" in input) {
    userData.em = input.em as string | string[] | null;
  }

  if ("ph" in input) {
    userData.ph = input.ph as string | string[] | number | null;
  }

  if ("lead_id" in input) {
    userData.lead_id = input.lead_id as string | number | null;
  }

  if ("external_id" in input) {
    userData.external_id = input.external_id as string | number | null;
  }

  if ("fbc" in input) {
    userData.fbc = input.fbc as string | null;
  }

  if ("fbp" in input) {
    userData.fbp = input.fbp as string | null;
  }

  if ("client_user_agent" in input) {
    userData.client_user_agent = normalizeString(input.client_user_agent) ?? null;
  }

  if ("client_ip_address" in input) {
    userData.client_ip_address = normalizeString(input.client_ip_address) ?? null;
  }

  return userData;
}

function sanitizeCustomData(input: Record<string, unknown>): LeadCustomData {
  const { event_source, lead_event_source, ...rest } = input;
  const resolvedEventSource = normalizeString(event_source) ?? "crm";
  const resolvedLeadEventSource = normalizeString(lead_event_source) ?? "DaCars";

  return {
    event_source: resolvedEventSource,
    lead_event_source: resolvedLeadEventSource,
    ...rest,
  };
}

function resolveActionSource(inputActionSource: unknown, resolvedEventSource: string): string {
  const normalized = normalizeString(inputActionSource);
  if (normalized) {
    return normalized;
  }

  return resolvedEventSource === "crm" ? "system_generated" : "website";
}

export async function POST(request: NextRequest) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch (error) {
    console.error("[Meta CAPI] Lead route invalid JSON", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, meta: null, error: "Payload invalid" }, { status: 400 });
  }

  const payloadRecord = toRecord(rawBody);
  const customInput = toRecord(payloadRecord.custom_data);
  const sanitizedCustomData = sanitizeCustomData(customInput);
  const userDataInput = sanitizeUserData(toRecord(payloadRecord.user_data));

  const eventName = normalizeString(payloadRecord.event_name) ?? "Lead";
  const eventTime = (() => {
    const value = payloadRecord.event_time;
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value);
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return Math.floor(parsed);
      }
    }
    return Math.floor(Date.now() / 1000);
  })();

  const eventId = normalizeString(payloadRecord.event_id);
  const testEventCode = normalizeString(payloadRecord.test_event_code);
  const resolvedEventSource = normalizeString(sanitizedCustomData.event_source) ?? "crm";
  const actionSource = resolveActionSource(payloadRecord.action_source, resolvedEventSource);

  const leadPayload: LeadServerPayload = {
    event_name: eventName,
    event_time: eventTime,
    action_source: actionSource,
    event_id: eventId,
    test_event_code: testEventCode,
    user_data: userDataInput,
    custom_data: sanitizedCustomData,
    attribution_data: (payloadRecord.attribution_data as Record<string, unknown> | null | undefined) ?? undefined,
    original_event_data: (payloadRecord.original_event_data as Record<string, unknown> | null | undefined) ?? undefined,
  };

  try {
    const result = await sendLead(leadPayload, { request });
    const status = result.ok ? 200 : 502;
    return NextResponse.json({ ok: result.ok, meta: result.meta }, { status });
  } catch (error) {
    console.error("[Meta CAPI] Lead route error", {
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, meta: null, error: "Meta Conversions API request failed" },
      { status: 500 },
    );
  }
}
