const normalizeHref = (href?: string): string => {
    if (!href) {
        return "";
    }

    return href.trim().toLowerCase();
};

export const isOffersHref = (href?: string): boolean => {
    const normalized = normalizeHref(href);

    if (normalized.length === 0) {
        return false;
    }

    if (normalized.startsWith("#offers") || normalized.startsWith("#oferte")) {
        return true;
    }

    return normalized.includes("/offers");
};

