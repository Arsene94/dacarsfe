import { headers } from "next/headers";

export const getRequestedPathname = async (): Promise<string> => {
  const headerList = await headers();
  const raw =
    headerList.get("x-dacars-pathname") ??
    headerList.get("x-invoke-path") ??
    headerList.get("next-url") ??
    headerList.get("x-original-url") ??
    "/";

  try {
    const parsed = new URL(raw, "https://dacars.local");
    return parsed.pathname || "/";
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
};

export const getRequestedLocale = async (): Promise<string | null> => {
  const headerList = await headers();
  const rawLocale = headerList.get("x-dacars-locale");
  const normalized = rawLocale?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
};
