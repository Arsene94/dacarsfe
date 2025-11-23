import { headers } from "next/headers";

export const getRequestedPathname = async (): Promise<string> => {
    const headerList = await headers();

    const candidates = [
        // Set by our middleware when rewriting localized routes.
        headerList.get("x-dacars-pathname"),
        // Next.js internal hints depending on runtime.
        headerList.get("x-invoke-path"),
        headerList.get("x-matched-path"),
        headerList.get("x-pathname"),
        // Original request url headers used by various proxies / Next internals.
        headerList.get("next-url"),
        headerList.get("x-original-url"),
        headerList.get("x-rewrite-url"),
        headerList.get("x-forwarded-uri"),
        headerList.get("x-request-uri"),
    ];

    const raw = candidates.find((value) => typeof value === "string" && value.trim().length > 0) ?? "/";

    try {
        const parsed = new URL(raw, "https://dacars.local");
        return parsed.pathname || "/";
    } catch {
        const normalized = raw.trim();
        return normalized.startsWith("/") ? normalized : `/${normalized}`;
    }
};

export const getRequestedLocale = async (): Promise<string | null> => {
    const headerList = await headers();
    const rawLocale = headerList.get("x-dacars-locale");
    const normalized = rawLocale?.trim();

    return normalized && normalized.length > 0 ? normalized : null;
};
