import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from "@/lib/api";

describe("resolveApiBaseUrl", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns the default base URL when the candidate is undefined", () => {
    expect(resolveApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("normalizes valid URLs by trimming whitespace and trailing slashes", () => {
    const candidate = " https://backend.dacars.ro/api/v1/ ";
    expect(resolveApiBaseUrl(candidate)).toBe("https://backend.dacars.ro/api/v1");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("falls back to the default base when pointing to the local frontend server", () => {
    const candidate = "http://127.0.0.1:3000/admin";
    expect(resolveApiBaseUrl(candidate)).toBe(DEFAULT_API_BASE_URL);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
