import { NextResponse } from "next/server";

const HEADER_CANDIDATES = [
  "x-client-ip",
  "x-forwarded-for",
  "forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "fastly-client-ip",
  "true-client-ip",
  "x-cluster-client-ip",
  "x-forwarded",
  "forwarded",
  "via",
];

const normalizeForwardedEntry = (entry: string) => {
  let candidate = entry.trim();
  if (!candidate) {
    return null;
  }

  const forwardedMatch = candidate.match(/for=([^;]+)/i);
  if (forwardedMatch && forwardedMatch[1]) {
    candidate = forwardedMatch[1];
  }

  candidate = candidate.split(/[,;]/)[0]?.trim() ?? "";
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith("\"") && candidate.endsWith("\"")) {
    candidate = candidate.slice(1, -1);
  }

  if (candidate.startsWith("[")) {
    const closingIndex = candidate.indexOf("]");
    if (closingIndex !== -1) {
      const ipv6 = candidate.slice(1, closingIndex);
      const remainder = candidate.slice(closingIndex + 1).trim();
      if (remainder.startsWith(":")) {
        const portPart = remainder.slice(1);
        if (/^\d+$/.test(portPart)) {
          return ipv6;
        }
      }
      return ipv6;
    }

    candidate = candidate.slice(1);
  }

  const sanitized = candidate.replace(/\s+/g, "");
  if (!sanitized || sanitized.toLowerCase() === "unknown") {
    return null;
  }

  if (sanitized.includes(":")) {
    const lastColonIndex = sanitized.lastIndexOf(":");
    const beforeLastColon = sanitized.slice(0, lastColonIndex);
    const portCandidate = sanitized.slice(lastColonIndex + 1);

    if (
      beforeLastColon.includes(".") &&
      lastColonIndex !== -1 &&
      /^\d+$/.test(portCandidate)
    ) {
      return beforeLastColon;
    }

    if (/^[a-f0-9:]+$/i.test(sanitized)) {
      return sanitized;
    }
  }

  return sanitized;
};

const sanitizeIpCandidate = (value: string) => {
  return value
    .split(",")
    .map((entry) => normalizeForwardedEntry(entry))
    .find((entry): entry is string => Boolean(entry)) ?? null;
};

const extractIpFromHeaders = (headers: Headers) => {
  for (const header of HEADER_CANDIDATES) {
    const value = headers.get(header);
    if (!value) {
      continue;
    }

    const candidate = sanitizeIpCandidate(value);
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

export async function GET(request: Request) {
  const ip = extractIpFromHeaders(request.headers) ?? null;
  const response = NextResponse.json({ ip });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
