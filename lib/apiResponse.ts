import type { ApiItemResponse, ApiItemResult, ApiListResponse, ApiListResult } from "@/types/api";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const extractItem = <T>(result: ApiItemResult<T>): T | null => {
  if (Array.isArray(result)) {
    return result.length > 0 ? (result[0] as T) : null;
  }

  if (isObject(result)) {
    const container = result as ApiItemResponse<T>;
    const {
      data,
      item,
      resource,
      result: nestedResult,
      car,
      booking,
      user,
      role,
    } = container;

    return (
      data ??
      item ??
      resource ??
      nestedResult ??
      car ??
      booking ??
      user ??
      role ??
      null
    );
  }

  return (result ?? null) as T | null;
};

export const extractList = <T>(result: ApiListResult<T>): T[] => {
  if (Array.isArray(result)) {
    return result;
  }

  if (isObject(result)) {
    const container = result as ApiListResponse<T>;
    return (
      container.data ??
      container.items ??
      container.results ??
      container.payload ??
      []
    );
  }

  return [];
};
