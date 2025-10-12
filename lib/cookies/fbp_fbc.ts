export type CookieHeaderSource =
  | Headers
  | { get(name: string): string | null | undefined }
  | Record<string, string | string[]>
  | null
  | undefined;

const COOKIE_NAME_FBP = "_fbp";
const COOKIE_NAME_FBC = "_fbc";
const FBCLID_PARAM = "fbclid";

function getCookieHeader(headers: CookieHeaderSource): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    const value = headers.get("cookie");
    return value ?? undefined;
  }

  if (typeof (headers as { get?: unknown }).get === "function") {
    const value = (headers as { get(name: string): string | null | undefined }).get("cookie");
    return value ?? undefined;
  }

  const record = headers as Record<string, string | string[]>;
  const direct = record.cookie ?? record.Cookie;
  if (typeof direct === "string") {
    return direct;
  }

  if (Array.isArray(direct)) {
    return direct.join("; ");
  }

  return undefined;
}

function parseCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const parts = cookieHeader.split(";");
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) {
      continue;
    }

    const [key, ...rest] = part.split("=");
    if (key !== name) {
      continue;
    }

    const value = rest.join("=");
    if (!value) {
      return undefined;
    }

    return decodeURIComponent(value.trim());
  }

  return undefined;
}

function normalizeFbcFromFbclid(fbclid: string | null | undefined): string | undefined {
  if (!fbclid) {
    return undefined;
  }

  const trimmed = fbclid.trim();
  if (!trimmed) {
    return undefined;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  return `fb.1.${timestamp}.${trimmed}`;
}

function parseUrl(input: string | URL | null | undefined): URL | undefined {
  if (!input) {
    return undefined;
  }

  try {
    return input instanceof URL ? input : new URL(input);
  } catch {
    return undefined;
  }
}

export function getFbp(headers?: CookieHeaderSource): string | undefined {
  const cookieHeader = getCookieHeader(headers);
  const value = parseCookieValue(cookieHeader, COOKIE_NAME_FBP);
  return value?.trim() ? value.trim() : undefined;
}

export function getFbc(url?: string | URL | null, headers?: CookieHeaderSource): string | undefined {
  const cookieHeader = getCookieHeader(headers);
  const cookieValue = parseCookieValue(cookieHeader, COOKIE_NAME_FBC);
  if (cookieValue?.trim()) {
    return cookieValue.trim();
  }

  const parsedUrl = parseUrl(url ?? undefined);
  const fbclid = parsedUrl?.searchParams.get(FBCLID_PARAM) ?? undefined;
  return normalizeFbcFromFbclid(fbclid ?? undefined);
}

