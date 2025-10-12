import { describe, expect, it, vi } from "vitest";
import { getFbc, getFbp } from "../fbp_fbc";

describe("fbp/fbc helpers", () => {
  it("extracts _fbp from cookie header", () => {
    const headers = new Headers();
    headers.append("cookie", "foo=bar; _fbp=fb.1.12345.6789");

    expect(getFbp(headers)).toBe("fb.1.12345.6789");
  });

  it("derives fbc from fbclid query param when cookie missing", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    try {
      const result = getFbc("https://example.com?fbclid=XYZ123", undefined);
      expect(result).toBe("fb.1.1700000000.XYZ123");
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("returns undefined when no data is available", () => {
    const headers = new Headers();
    headers.append("cookie", "foo=bar");
    expect(getFbp(headers)).toBeUndefined();
    expect(getFbc("https://example.com", headers)).toBeUndefined();
  });
});
