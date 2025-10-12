import { createHash } from "node:crypto";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function toBuffer(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export async function sha256Browser(value: string): Promise<string> {
  const normalized = normalize(value);
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API nu este disponibil în acest mediu");
  }

  const buffer = await window.crypto.subtle.digest("SHA-256", toBuffer(normalized));
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function sha256Node(value: string): string {
  const normalized = normalize(value);
  return createHash("sha256").update(normalized).digest("hex");
}

export { normalize as normalizeForHash };
