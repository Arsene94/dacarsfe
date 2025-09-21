import type { FleetCar } from "@/types/car";

const FALLBACK_SITE_URL = "https://dacars.ro";

const ensureProtocol = (url: string): string => {
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    return `https://${url.replace(/^\/+/, "")}`;
};

export const resolveSiteUrl = (candidate?: string | null): string => {
    if (candidate && typeof candidate === "string") {
        const trimmed = candidate.trim();
        if (trimmed.length > 0) {
            try {
                return new URL(ensureProtocol(trimmed)).toString().replace(/\/$/, "");
            } catch {
                return FALLBACK_SITE_URL;
            }
        }
    }
    return FALLBACK_SITE_URL;
};

export const ensureAbsoluteUrl = (value: string, baseUrl: string): string => {
    if (!value) {
        return baseUrl;
    }

    try {
        return new URL(value).toString();
    } catch {
        const normalizedBase = baseUrl.replace(/\/$/, "");
        const normalizedPath = value.startsWith("/") ? value : `/${value}`;
        return `${normalizedBase}${normalizedPath}`;
    }
};

const parseNumericPrice = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const cleaned = value.replace(/[^\d.,-]/g, "");
        if (cleaned.length === 0) {
            return null;
        }
        const normalized = cleaned.replace(/\./g, "").replace(",", ".");
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

export type StructuredDataCar = {
    id: number | string;
    name: string;
    image?: string;
    url?: string;
    description?: string;
    price?: number | string | null;
    seats?: number | null;
    transmission?: string | null;
    fuel?: string | null;
    availability?: boolean;
    category?: string | null;
};

type VehicleItemListOptions = {
    baseUrl: string;
    pageUrl: string;
    name: string;
    description?: string;
    currency?: string;
};

export const createVehicleItemListStructuredData = (
    cars: StructuredDataCar[],
    options: VehicleItemListOptions,
): Record<string, unknown> | null => {
    if (!cars || cars.length === 0) {
        return null;
    }

    const currency = options.currency ?? "EUR";
    const normalizedPageUrl = ensureAbsoluteUrl(options.pageUrl, options.baseUrl);

    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: options.name,
        description: options.description,
        url: normalizedPageUrl,
        numberOfItems: cars.length,
        itemListElement: cars.map((car, index) => {
            const price = parseNumericPrice(car.price);
            const itemUrl = ensureAbsoluteUrl(car.url ?? `${normalizedPageUrl}#car-${car.id}`, options.baseUrl);
            const availability = car.availability === false
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock";

            const vehicle: Record<string, unknown> = {
                "@type": "Car",
                name: car.name,
                sku: String(car.id),
                brand: {
                    "@type": "Brand",
                    name: "DaCars",
                },
            };

            if (car.description) {
                vehicle.description = car.description;
            }
            if (car.image) {
                vehicle.image = ensureAbsoluteUrl(car.image, options.baseUrl);
            }
            if (car.category) {
                vehicle.category = car.category;
            }
            if (typeof car.seats === "number" && car.seats > 0) {
                vehicle.vehicleSeatingCapacity = car.seats;
            }
            if (car.transmission) {
                vehicle.vehicleTransmission = car.transmission;
            }
            if (car.fuel) {
                vehicle.fuelType = car.fuel;
            }

            if (price != null) {
                vehicle.offers = {
                    "@type": "Offer",
                    price,
                    priceCurrency: currency,
                    availability,
                    url: itemUrl,
                };
            }

            return {
                "@type": "ListItem",
                position: index + 1,
                url: itemUrl,
                item: vehicle,
            };
        }),
    };
};

type OrganizationContactPoint = {
    contactType: string;
    telephone: string;
    areaServed?: string;
    availableLanguage?: string[];
    email?: string;
};

type OrganizationAddress = {
    streetAddress: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
};

type OrganizationOptions = {
    name: string;
    url: string;
    logo: string;
    telephone?: string;
    email?: string;
    sameAs?: string[];
    description?: string;
    address?: OrganizationAddress;
    contactPoints?: OrganizationContactPoint[];
    openingHours?: Array<{
        dayOfWeek: string[];
        opens: string;
        closes: string;
    }>;
};

export const createOrganizationStructuredData = (
    options: OrganizationOptions,
): Record<string, unknown> => {
    const baseUrl = resolveSiteUrl(options.url);

    const data: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "AutoRental",
        name: options.name,
        url: baseUrl,
        logo: ensureAbsoluteUrl(options.logo, baseUrl),
    };

    if (options.description) {
        data.description = options.description;
    }

    if (options.telephone) {
        data.telephone = options.telephone;
    }

    if (options.email) {
        data.email = options.email;
    }

    if (options.sameAs?.length) {
        data.sameAs = options.sameAs;
    }

    if (options.address) {
        data.address = {
            "@type": "PostalAddress",
            streetAddress: options.address.streetAddress,
            addressLocality: options.address.addressLocality,
            addressCountry: options.address.addressCountry,
            ...(options.address.addressRegion
                ? { addressRegion: options.address.addressRegion }
                : {}),
            ...(options.address.postalCode ? { postalCode: options.address.postalCode } : {}),
        };
    }

    if (options.contactPoints?.length) {
        data.contactPoint = options.contactPoints.map((contact) => ({
            "@type": "ContactPoint",
            contactType: contact.contactType,
            telephone: contact.telephone,
            ...(contact.email ? { email: contact.email } : {}),
            ...(contact.areaServed ? { areaServed: contact.areaServed } : {}),
            ...(contact.availableLanguage?.length
                ? { availableLanguage: contact.availableLanguage }
                : {}),
        }));
    }

    if (options.openingHours?.length) {
        data.openingHoursSpecification = options.openingHours.map((item) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: item.dayOfWeek,
            opens: item.opens,
            closes: item.closes,
        }));
    }

    return data;
};

type RentalServiceOptions = {
    name: string;
    url: string;
    description: string;
    areaServed?: string[];
    termsUrl?: string;
    serviceUrl?: string;
    priceRange?: string;
};

export const createRentalServiceStructuredData = (
    options: RentalServiceOptions,
): Record<string, unknown> => {
    const baseUrl = resolveSiteUrl(options.url);

    return {
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: "Închirieri auto",
        name: options.name,
        description: options.description,
        provider: {
            "@type": "AutoRental",
            name: options.name,
            url: baseUrl,
        },
        areaServed: options.areaServed,
        termsOfService: options.termsUrl ? ensureAbsoluteUrl(options.termsUrl, baseUrl) : undefined,
        url: options.serviceUrl ? ensureAbsoluteUrl(options.serviceUrl, baseUrl) : baseUrl,
        priceRange: options.priceRange,
    };
};

type SearchActionOptions = {
    siteUrl: string;
    siteName: string;
    target: string;
    queryInput: string;
};

export const createSearchActionStructuredData = (
    options: SearchActionOptions,
): Record<string, unknown> => {
    const baseUrl = resolveSiteUrl(options.siteUrl);

    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        url: baseUrl,
        name: options.siteName,
        potentialAction: {
            "@type": "SearchAction",
            target: ensureAbsoluteUrl(options.target, baseUrl),
            "query-input": options.queryInput,
        },
    };
};

type BreadcrumbItem = {
    name: string;
    item: string;
};

export const createBreadcrumbStructuredData = (
    items: BreadcrumbItem[],
): Record<string, unknown> | null => {
    if (!items || items.length === 0) {
        return null;
    }

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.name,
            item: entry.item,
        })),
    };
};

export const mapFleetCarsToStructuredData = (
    cars: FleetCar[],
    baseUrl: string,
): StructuredDataCar[] =>
    cars.map((car) => ({
        id: car.id,
        name: car.name,
        image: car.icon,
        price: car.price ?? null,
        seats: car.number_of_seats,
        transmission: car.transmission?.name ?? null,
        fuel: car.fuel?.name ?? null,
        availability: true,
        category: car.categories?.name ?? null,
    }));
