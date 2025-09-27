import type { CarFilterParams, CarSearchUiPayload } from "@/types/car";

const resolveDate = (primary?: string, fallback?: string): string | undefined => {
    if (typeof primary === "string" && primary.trim().length > 0) {
        return primary;
    }
    if (typeof fallback === "string" && fallback.trim().length > 0) {
        return fallback;
    }
    return undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return undefined;
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const resolveString = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const handledCarFilterKeys = new Set([
    "start_date",
    "startDate",
    "end_date",
    "endDate",
    "page",
    "per_page",
    "perPage",
    "limit",
    "sort_by",
    "sortBy",
    "make_id",
    "vehicle_type_id",
    "vehicle_type",
    "car_type",
    "transmission",
    "fuel",
    "fuel_type",
    "number_of_seats",
    "seats",
    "year",
    "search",
    "include",
    "status",
]);

export function mapCarSearchFilters(payload: CarSearchUiPayload): CarFilterParams {
    const include = resolveString(payload.include);
    const status = resolveString(payload.status ?? undefined);

    const mapped: CarFilterParams = {
        start_date: resolveDate(payload.start_date, payload.startDate),
        end_date: resolveDate(payload.end_date, payload.endDate),
        page: toOptionalNumber(payload.page),
        per_page: toOptionalNumber(payload.per_page ?? payload.perPage),
        limit: toOptionalNumber(payload.limit),
        sort_by: resolveString(payload.sort_by ?? payload.sortBy),
        make_id: toOptionalNumber(payload.make_id),
        vehicle_type_id: toOptionalNumber(
            payload.vehicle_type_id ?? payload.vehicle_type ?? payload.car_type,
        ),
        transmission_id: toOptionalNumber(payload.transmission),
        fuel_type_id: toOptionalNumber(payload.fuel ?? payload.fuel_type),
        number_of_seats: toOptionalNumber(payload.number_of_seats ?? payload.seats),
        year: toOptionalNumber(payload.year),
        name_like: resolveString(payload.search),
        include: include ?? "make,type,transmission,fuel,categories,colors",
        status,
    };

    Object.entries(payload).forEach(([key, value]) => {
        if (handledCarFilterKeys.has(key)) {
            return;
        }

        if (value === undefined || value === null) {
            return;
        }

        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) {
                return;
            }
            mapped[key] = trimmed;
            return;
        }

        if (typeof value === "number") {
            if (!Number.isFinite(value)) {
                return;
            }
            mapped[key] = value;
            return;
        }

        if (typeof value === "boolean") {
            mapped[key] = value;
            return;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return;
            }
            mapped[key] = value.filter((entry) => entry !== undefined && entry !== null);
        }
    });

    return mapped;
}
