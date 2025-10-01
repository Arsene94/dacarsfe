import { resolveProxyUrl } from "@/lib/imageProxy";

const STORAGE_BASE = process.env.NEXT_PUBLIC_STORAGE_URL ?? "https://backend.dacars.ro/storage";

type ResolveMediaUrlOptions = {
  proxyRemote?: boolean;
};

export const resolveMediaUrl = (
  value?: string | null,
  options?: ResolveMediaUrlOptions
): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return resolveProxyUrl(trimmed, options);
  }
  const base = STORAGE_BASE.replace(/\/$/, "");
  const path = trimmed.replace(/^\/+/, "");
  const absoluteUrl = `${base}/${path}`;
  return resolveProxyUrl(absoluteUrl, options);
};

export const getStorageBaseUrl = (): string => STORAGE_BASE.replace(/\/$/, "");
