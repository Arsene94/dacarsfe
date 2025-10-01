import imageProxyConfig from "@/config/image-proxy.json";

type HostRule = {
  type: "exact" | "suffix";
  value: string;
};

type ResolveProxyOptions = {
  proxyRemote?: boolean;
};

const PROXY_ROUTE_PATH = "/api/images/webp";

const configAllowlist = Array.isArray(imageProxyConfig?.allowlist)
  ? imageProxyConfig.allowlist
  : [];

const envAllowlist = (process.env.IMAGE_PROXY_ALLOWLIST ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);

const derivedHosts = [
  process.env.NEXT_PUBLIC_STORAGE_URL,
  process.env.NEXT_PUBLIC_BACKEND_URL,
]
  .map((value) => extractHostname(value))
  .filter((value): value is string => Boolean(value));

const hostRules = buildHostRules([
  ...configAllowlist,
  ...envAllowlist,
  ...derivedHosts,
]);

const exactHosts = new Set<string>();
const suffixHosts: string[] = [];

for (const rule of hostRules) {
  if (rule.type === "exact") {
    exactHosts.add(rule.value);
  } else {
    suffixHosts.push(rule.value);
  }
}

function extractHostname(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase();
  } catch (error) {
    return null;
  }
}

function buildHostRules(entries: unknown[]): HostRule[] {
  const rules: HostRule[] = [];
  for (const entry of entries) {
    if (typeof entry !== "string") {
      continue;
    }
    const normalized = entry.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    if (normalized.startsWith("*.")) {
      rules.push({ type: "suffix", value: normalizeSuffix(normalized.slice(1)) });
      continue;
    }
    if (normalized.startsWith(".")) {
      rules.push({ type: "suffix", value: normalizeSuffix(normalized) });
      continue;
    }
    rules.push({ type: "exact", value: normalized });
  }
  return rules;
}

function normalizeSuffix(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith(".")) {
    return `.${trimmed.replace(/^\.+/, "")}`;
  }
  return trimmed.replace(/\.+/g, ".");
}

export function isHostAllowed(hostname: string): boolean {
  if (!hostname) {
    return false;
  }
  const normalized = hostname.toLowerCase();
  if (exactHosts.has(normalized)) {
    return true;
  }
  return suffixHosts.some((suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix));
}

export function shouldProxyRemoteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return false;
    }
    return isHostAllowed(parsed.hostname);
  } catch (error) {
    return false;
  }
}

export function buildProxyUrl(url: string): string {
  const encoded = encodeURIComponent(url);
  return `${PROXY_ROUTE_PATH}?url=${encoded}`;
}

export function resolveProxyUrl(value?: string | null, options?: ResolveProxyOptions): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("/api/")) {
    return trimmed;
  }
  const proxyRemote = options?.proxyRemote ?? true;
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (!proxyRemote) {
    return trimmed;
  }
  return shouldProxyRemoteUrl(trimmed) ? buildProxyUrl(trimmed) : trimmed;
}

export function getProxyRoutePath(): string {
  return PROXY_ROUTE_PATH;
}
