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

