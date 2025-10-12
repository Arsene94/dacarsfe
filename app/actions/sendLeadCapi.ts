"use server";

import { sendLead, type LeadServerPayload, type SendLeadOptions, type SendLeadResult } from "@/lib/capi/sendLead";

export async function sendLeadCapi(payload: LeadServerPayload, options?: SendLeadOptions): Promise<SendLeadResult> {
  return sendLead(payload, options);
}
