export const getBrowserCookieValue = (cookieName: string): string | null => {
    if (typeof document === "undefined") {
        return null;
    }

    if (typeof cookieName !== "string" || cookieName.trim().length === 0) {
        return null;
    }

    const entries = document.cookie ? document.cookie.split(";") : [];

    for (const entry of entries) {
        const [rawName, ...rawValueParts] = entry.split("=");
        if (!rawName) {
            continue;
        }

        if (rawName.trim() !== cookieName) {
            continue;
        }

        const rawValue = rawValueParts.join("=").trim();
        if (!rawValue) {
            return null;
        }

        try {
            const decoded = decodeURIComponent(rawValue);
            const normalized = decoded.trim();
            return normalized.length > 0 ? normalized : null;
        } catch (error) {
            console.warn(`Nu s-a putut decodifica valoarea cookie-ului ${cookieName}`, error);
            return rawValue;
        }
    }

    return null;
};
