import { headers } from "next/headers";

export const getRequestedPathname = (): string => {
  const headerList = headers();
  const raw =
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
