const STORAGE_BASE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";

export const resolveMediaUrl = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = STORAGE_BASE.replace(/\/$/, "");
  const path = trimmed.replace(/^\/+/, "");
  return `${base}/${path}`;
};

export const getStorageBaseUrl = (): string => STORAGE_BASE.replace(/\/$/, "");
