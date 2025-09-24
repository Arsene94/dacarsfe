import type { PublicContentDictionary } from "@/types/public-content";

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const mergeContent = (
  base: PublicContentDictionary,
  override: PublicContentDictionary,
): PublicContentDictionary => {
  const result: PublicContentDictionary = { ...base };

  Object.entries(override).forEach(([key, value]) => {
    const existing = result[key];

    if (Array.isArray(existing) && Array.isArray(value)) {
      result[key] = value;
      return;
    }

    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = mergeContent(existing, value);
      return;
    }

    result[key] = value;
  });

  return result;
};

export const getByPath = (source: unknown, path: string): unknown => {
  if (!isPlainObject(source) || typeof path !== "string" || path.length === 0) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((acc, segment) => {
    if (!segment) {
      return acc;
    }

    if (Array.isArray(acc)) {
      const index = Number(segment);
      if (Number.isInteger(index)) {
        return acc[index];
      }
      return undefined;
    }

    if (isPlainObject(acc) && segment in acc) {
      return (acc as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
};

export const isCompatibleValue = (value: unknown, fallback: unknown): boolean => {
  if (fallback === null || typeof fallback === "undefined") {
    return typeof value !== "undefined";
  }

  if (Array.isArray(fallback)) {
    return Array.isArray(value);
  }

  if (isPlainObject(fallback)) {
    return isPlainObject(value);
  }

  return typeof value === typeof fallback;
};

export const formatTemplate = (
  template: string,
  params: Record<string, string | number>,
): string => {
  if (typeof template !== "string" || template.length === 0) {
    return "";
  }

  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => {
    const value = params[key];
    return typeof value === "undefined" || value === null ? "" : String(value);
  });
};

const isNumericSegment = (segment: string): boolean => /^\d+$/.test(segment);

const setNestedValue = (
  current: unknown,
  segments: readonly string[],
  value: unknown,
): unknown => {
  if (segments.length === 0) {
    return value;
  }

  const [segment, ...rest] = segments;

  if (isNumericSegment(segment)) {
    const index = Number(segment);
    const baseArray = Array.isArray(current) ? [...current] : [];
    const existingValue = Array.isArray(current) ? current[index] : undefined;
    baseArray[index] = setNestedValue(existingValue, rest, value);
    return baseArray;
  }

  const baseObject = isPlainObject(current)
    ? { ...(current as Record<string, unknown>) }
    : {};
  const existingValue = isPlainObject(current)
    ? (current as Record<string, unknown>)[segment]
    : undefined;
  baseObject[segment] = setNestedValue(existingValue, rest, value);
  return baseObject;
};

export const setByPath = (
  source: PublicContentDictionary,
  path: string,
  value: unknown,
): PublicContentDictionary => {
  if (typeof path !== "string" || path.length === 0) {
    return source;
  }

  const segments = path.split(".");
  return setNestedValue(source, segments, value) as PublicContentDictionary;
};

export interface PublicContentLeafEntry {
  path: string;
  segments: readonly string[];
  value: string;
}

const collectStringLeaves = (
  value: unknown,
  segments: string[],
  acc: PublicContentLeafEntry[],
) => {
  if (typeof value === "string") {
    const path = segments.join(".");
    if (path.length > 0) {
      acc.push({ path, segments, value });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectStringLeaves(entry, [...segments, String(index)], acc);
    });
    return;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, child]) => {
      collectStringLeaves(child, [...segments, key], acc);
    });
  }
};

export const extractStringLeafEntries = (
  content: PublicContentDictionary | null | undefined,
): PublicContentLeafEntry[] => {
  if (!isPlainObject(content)) {
    return [];
  }

  const entries: PublicContentLeafEntry[] = [];
  collectStringLeaves(content, [], entries);
  return entries;
};

