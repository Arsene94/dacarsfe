import { extractItem, extractList } from "@/lib/apiResponse";
import type { ApiItemResult, ApiListResult } from "@/types/api";
import type {
  AdminBookingCarOption,
  AdminBookingCustomerSummary,
  AdminBookingExtension,
  BookingContractResponse,
  CustomerPhoneSearchResult,
} from "@/types/admin";
import type { ApiCar, CarAvailabilityResponse } from "@/types/car";
import type { ReservationExtension } from "@/types/reservation";

const toTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
};

const pickNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeBooleanFlag = (value: unknown, defaultValue = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "da", "yes"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "nu", "no"].includes(normalized)) {
      return false;
    }
  }

  return defaultValue;
};

export const normalizeReservationExtension = (
  extension: ReservationExtension | Record<string, unknown> | null | undefined,
): AdminBookingExtension | null => {
  if (!extension || typeof extension !== "object") {
    return null;
  }

  const source = extension as Record<string, unknown>;
  const from =
    pickNonEmptyString(source.from) ??
    pickNonEmptyString((source as { start?: unknown }).start);
  const to =
    pickNonEmptyString(source.to) ??
    pickNonEmptyString((source as { end?: unknown }).end);

  const days = parseOptionalNumber(source.days);
  const pricePerDay = parseOptionalNumber(
    source.price_per_day ?? (source as { pricePerDay?: unknown }).pricePerDay,
  );
  const total = parseOptionalNumber(source.total);
  const remainingPayment = parseOptionalNumber(
    source.remaining_payment ?? (source as { remainingPayment?: unknown }).remainingPayment,
  );
  const hasPaidFlag =
    typeof (source as { paid?: unknown }).paid === "boolean" ||
    typeof (source as { paid?: unknown }).paid === "number" ||
    typeof (source as { paid?: unknown }).paid === "string";
  const paid = normalizeBooleanFlag((source as { paid?: unknown }).paid, false);

  const hasAnyValue =
    (from && from.length > 0) ||
    (to && to.length > 0) ||
    typeof days === "number" ||
    typeof pricePerDay === "number" ||
    typeof total === "number" ||
    typeof remainingPayment === "number" ||
    hasPaidFlag;

  if (!hasAnyValue) {
    return null;
  }

  return {
    from: from ?? null,
    to: to ?? null,
    days: typeof days === "number" ? days : null,
    pricePerDay: typeof pricePerDay === "number" ? pricePerDay : null,
    total: typeof total === "number" ? total : null,
    paid,
    remainingPayment: typeof remainingPayment === "number" ? remainingPayment : null,
  } satisfies AdminBookingExtension;
};

export const normalizeAdminCarOption = (
  car: ApiCar | AdminBookingCarOption,
): AdminBookingCarOption => {
  const license =
    toTrimmedString(car.license_plate) ||
    toTrimmedString((car as { licensePlate?: unknown }).licensePlate) ||
    toTrimmedString((car as { plate?: unknown }).plate);
  const transmissionName =
    typeof car.transmission === "string"
      ? car.transmission.trim()
      :
          toTrimmedString((car.transmission as { name?: unknown })?.name) ||
          toTrimmedString(car.transmission_name) ||
          toTrimmedString(car.transmissionName);
  const fuelName =
    typeof car.fuel === "string"
      ? car.fuel.trim()
      :
          toTrimmedString((car.fuel as { name?: unknown })?.name) ||
          toTrimmedString(car.fuel_name) ||
          toTrimmedString(car.fuelName);

  const normalizeRelation = (
    value: ApiCar["transmission"] | AdminBookingCarOption["transmission"],
    fallback: string,
  ): AdminBookingCarOption["transmission"] => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return { name: trimmed.length > 0 ? trimmed : fallback };
    }

    if (value && typeof value === "object") {
      const name = toTrimmedString((value as { name?: unknown }).name) || fallback;
      return { ...(value as Record<string, unknown>), name } as AdminBookingCarOption["transmission"];
    }

    return { name: fallback };
  };

  const transmission = normalizeRelation(car.transmission, transmissionName);
  const fuel = normalizeRelation(car.fuel, fuelName);

  return {
    ...car,
    license_plate: license,
    transmission,
    fuel,
  };
};

export const mapCustomerSearchResults = (
  records: CustomerPhoneSearchResult[],
): AdminBookingCustomerSummary[] => {
  return records.flatMap((record) => {
    const phones = Array.isArray(record.phones)
      ? record.phones.filter((phone): phone is string => typeof phone === "string")
      : [];
    if (phones.length === 0) {
      return [] as AdminBookingCustomerSummary[];
    }

    const nameCandidates: Array<unknown> = [
      record.latest?.name,
      ...(Array.isArray(record.names) ? record.names : []),
    ];
    const name = nameCandidates.map(toTrimmedString).find((value) => value.length > 0) ?? "";
    const email = toTrimmedString(record.email);
    const idValue =
      typeof record.id === "number" || typeof record.id === "string"
        ? record.id
        : null;

    return phones
      .map((phone) => phone.trim())
      .filter((phone) => phone.length > 0)
      .map((phone) => ({
        id: idValue,
        name,
        phone,
        email,
      }));
  });
};

export const extractFirstCar = (
  response:
    | CarAvailabilityResponse
    | ApiItemResult<ApiCar>
    | ApiListResult<ApiCar>
    | ApiCar[]
    | null
    | undefined,
): ApiCar | null => {
  if (!response) {
    return null;
  }

  if (Array.isArray(response)) {
    return response[0] ?? null;
  }

  if (typeof response === "object" && response !== null && "data" in response) {
    const payload = (response as CarAvailabilityResponse).data;
    if (Array.isArray(payload)) {
      return payload[0] ?? null;
    }
    if (payload && typeof payload === "object") {
      return payload as ApiCar;
    }
  }

  const item = extractItem(response as ApiItemResult<ApiCar>);
  if (item) {
    return item;
  }

  const list = extractList(response as ApiListResult<ApiCar>);
  return list[0] ?? null;
};

export interface ResolvedContractUrl {
  url: string | null;
  revoke?: () => void;
}

export const resolveContractUrl = (
  response:
    | BookingContractResponse
    | ApiItemResult<BookingContractResponse>
    | ApiListResult<BookingContractResponse>
    | Blob
    | null
    | undefined,
): ResolvedContractUrl => {

  if (!response) {
    return { url: null };
  }
  if (response instanceof Blob) {
    const objectUrl = URL.createObjectURL(response);
    return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
  }

  const payload = Array.isArray(response)
    ? response[0] ?? null
    : response ?? null;


  if (!payload) {
    return { url: null };
  }

  const url = payload.contract_url ?? payload.url ?? null;
  if (typeof url === "string" && url.trim().length > 0) {
    return { url };
  }

  return { url: null };
};
