import { extractItem, extractList } from "@/lib/apiResponse";
import type { ApiItemResult, ApiListResult } from "@/types/api";
import type {
  AdminBookingCarOption,
  AdminBookingCustomerSummary,
  BookingContractResponse,
  CustomerPhoneSearchResult,
} from "@/types/admin";
import type { ApiCar, CarAvailabilityResponse } from "@/types/car";

const toTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

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
